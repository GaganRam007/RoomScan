import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { detectionPrompt, detectionSchema } from "../../../lib/detection";

export const runtime = "nodejs";
// Allow enough time for a slow upstream call plus a retry or two before the platform times
// the function out. Vercel clamps this to whatever the current plan allows.
export const maxDuration = 60;

const windowMs = 60_000;
const maxRequests = 5;
const requests = new Map<string, { count: number; resetAt: number }>();

// Photos are downscaled before they're sent to Gemini. Identifying an appliance doesn't need
// full camera resolution, and Gemini bills/tokenizes images based on pixel count — a typical
// phone photo (3000-4000px wide, several MB) shrinks to a few hundred KB with no meaningful
// loss of detection accuracy, which cuts both request latency and per-scan API cost.
const MAX_IMAGE_DIMENSION = 1280;
const JPEG_QUALITY = 82;

function clientKey(request: NextRequest) {
  return request.headers.get("x-vercel-forwarded-for") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

function trustedOrigin(request: NextRequest) {
  const expected = process.env.NODE_ENV === "production" ? process.env.APP_URL : request.nextUrl.origin;
  return Boolean(expected) && request.headers.get("origin") === expected;
}

async function rateLimit(request: NextRequest): Promise<"ok" | "limited" | "unavailable"> {
  const key = `roomscan:detect:${clientKey(request)}`;
  if (process.env.NODE_ENV === "production") {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return "unavailable";
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const increment = await fetch(`${url}/incr/${encodeURIComponent(key)}`, { headers, cache: "no-store" });
      const { result } = await increment.json() as { result: number };
      if (result === 1) await fetch(`${url}/expire/${encodeURIComponent(key)}/60`, { headers, cache: "no-store" });
      return result > maxRequests ? "limited" : "ok";
    } catch { return "unavailable"; }
  }
  const now = Date.now();
  const entry = requests.get(key);
  if (!entry || entry.resetAt < now) { requests.set(key, { count: 1, resetAt: now + windowMs }); return "ok"; }
  entry.count += 1;
  return entry.count > maxRequests ? "limited" : "ok";
}

// Resize + re-encode as JPEG to shrink the payload sent to Gemini. Falls back to the original
// bytes if sharp can't process a given file for any reason, so a resize hiccup never blocks a scan.
async function toImagePart(photo: File): Promise<{ inlineData: { mimeType: string; data: string } }> {
  const original = Buffer.from(await photo.arrayBuffer());
  try {
    const resized = await sharp(original)
      .rotate()
      .resize({ width: MAX_IMAGE_DIMENSION, height: MAX_IMAGE_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
    return { inlineData: { mimeType: "image/jpeg", data: resized.toString("base64") } };
  } catch (resizeError) {
    console.error("RoomScan: image resize failed, sending original bytes", resizeError);
    return { inlineData: { mimeType: photo.type, data: original.toString("base64") } };
  }
}

function isRetryableStatus(status: unknown): boolean {
  return status === 429 || status === 503;
}

// Gemini occasionally returns transient 429 (rate limited) or 503 (overloaded) errors that
// resolve themselves within seconds. Retry those with a short backoff instead of failing the
// whole scan; anything else (bad request, auth, etc.) fails immediately since retrying won't help.
async function generateWithRetry(ai: GoogleGenAI, params: Parameters<InstanceType<typeof GoogleGenAI>["models"]["generateContent"]>[0], maxAttempts = 3) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error) {
      lastError = error;
      const status = (error as { status?: number } | null)?.status;
      if (!isRetryableStatus(status) || attempt === maxAttempts - 1) throw error;
      const delay = 700 * 2 ** attempt + Math.random() * 300;
      console.error(`RoomScan: Gemini call failed with status ${status}, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxAttempts})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Extract the first {...} JSON object from arbitrary model text — robust to leading/trailing
// commentary and markdown code fences, which plain-text JSON mode occasionally adds despite
// being told not to.
function extractJson(text: string): unknown {
  const stripped = text.replace(/```(json)?/gi, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("No JSON object found in model output");
  return JSON.parse(stripped.slice(start, end + 1));
}

// Plain-text JSON mode has no structural enforcement, so the model can occasionally use
// slightly different field names/formats than requested. Normalize the common variants we've
// actually seen before strict validation, instead of failing the whole scan.
function normalizeItem(raw: unknown): unknown {
  if (typeof raw !== "object" || raw === null) return raw;
  const item = { ...(raw as Record<string, unknown>) };

  if (item.visible_label_text === undefined && typeof item.rating_brand_text !== "undefined") {
    item.visible_label_text = item.rating_brand_text;
  }
  if (item.needs_clarification === undefined && typeof item.clarification_needed !== "undefined") {
    item.needs_clarification = item.clarification_needed;
  }
  if ((item.estimated_wattage_min === undefined || item.estimated_wattage_max === undefined) && typeof item.wattage_range_watts === "string") {
    const match = item.wattage_range_watts.match(/(\d+)\s*-\s*(\d+)/);
    if (match) {
      item.estimated_wattage_min = Number(match[1]);
      item.estimated_wattage_max = Number(match[2]);
    } else {
      const single = item.wattage_range_watts.match(/(\d+)/);
      if (single) { item.estimated_wattage_min = Number(single[1]); item.estimated_wattage_max = Number(single[1]); }
    }
  }
  if (typeof item.confidence === "number") {
    item.confidence = item.confidence >= 0.75 ? "high" : item.confidence >= 0.4 ? "medium" : "low";
  }
  return item;
}

function normalizePayload(json: unknown): unknown {
  if (typeof json !== "object" || json === null) return json;
  const payload = json as Record<string, unknown>;
  if (Array.isArray(payload.detected_items)) {
    return { ...payload, detected_items: payload.detected_items.map(normalizeItem) };
  }
  return json;
}

export async function POST(request: NextRequest) {
  if (!trustedOrigin(request)) return NextResponse.json({ error: "Cross-origin scans are not allowed." }, { status: 403 });
  const rate = await rateLimit(request);
  if (rate === "unavailable") return NextResponse.json({ error: "Scanning is temporarily unavailable." }, { status: 503 });
  if (rate === "limited") return NextResponse.json({ error: "Too many scans. Please wait a minute and try again." }, { status: 429 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "AI scanning is not configured." }, { status: 503 });

  const body = await request.formData();
  const photos = body.getAll("photos").filter((entry): entry is File => entry instanceof File);
  if (!photos.length || photos.length > 3) return NextResponse.json({ error: "Upload between one and three photos." }, { status: 400 });
  if (photos.some((photo) => !photo.type.startsWith("image/") || photo.size > 10 * 1024 * 1024)) {
    return NextResponse.json({ error: "Each upload must be an image under 10 MB." }, { status: 400 });
  }

  const imageParts = await Promise.all(photos.map(toImagePart));
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const systemInstruction = `${detectionPrompt}\n\nRespond with ONLY a single raw JSON object of the shape {"detected_items": [...]}. No markdown code fences, no commentary before or after, no explanation — JSON only.`;

  try {
    const response = await generateWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [{
        role: "user",
        parts: [{ text: "Inspect these photos of one room. Deduplicate appliances that appear in more than one photo." }, ...imageParts]
      }],
      config: {
        systemInstruction,
        maxOutputTokens: 12000
      }
    });
    const rawText = response.text ?? "";
    let parsedJson: unknown;
    try {
      parsedJson = extractJson(rawText);
    } catch (extractError) {
      console.error("RoomScan: could not extract JSON from model output", extractError, "raw text:", rawText.slice(0, 2000));
      return NextResponse.json({ error: "The scan returned an invalid result. Please retry." }, { status: 502 });
    }
    const parsed = detectionSchema.safeParse(normalizePayload(parsedJson));
    if (!parsed.success) {
      console.error("RoomScan: model JSON failed schema validation", parsed.error.flatten(), "raw text:", rawText.slice(0, 2000));
      return NextResponse.json({ error: "The scan returned an invalid result. Please retry." }, { status: 502 });
    }
    return NextResponse.json(parsed.data);
  } catch (error) {
    const status = (error as { status?: number } | null)?.status;
    console.error("RoomScan detection failed", error);
    if (isRetryableStatus(status)) {
      return NextResponse.json({ error: "Gemini is temporarily overloaded. Please try again in a moment." }, { status: 503 });
    }
    return NextResponse.json({ error: "We couldn't analyse that photo. Please try another clear room photo." }, { status: 502 });
  }
}
