import { z } from "zod";
import { applianceCategories } from "./categories";

export { applianceCategories };

export const detectionSchema = z.object({
  detected_items: z.array(z.object({
    category: z.enum(applianceCategories),
    description: z.string().min(1).max(160),
    visible_label_text: z.string().nullable(),
    estimated_wattage_min: z.number().int().positive().max(10000),
    estimated_wattage_max: z.number().int().positive().max(10000),
    confidence: z.enum(["high", "medium", "low"]),
    needs_clarification: z.boolean(),
    clarification_question: z.string().nullable(),
    bounding_box: z.tuple([z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1), z.number().min(0).max(1)]).nullable()
  })).max(30)
});

export type DetectedItem = z.infer<typeof detectionSchema>["detected_items"][number];

export const detectionPrompt = `You identify electrical and electronic appliances in residential room photographs for a home energy estimate.

Examine the ENTIRE scene systematically before answering — the ceiling, every wall, the floor, desks/shelves, and any furniture — rather than stopping after the first few obvious items. Look closely for items that are easy to miss on a first pass, such as:
- ambient/strip LED lighting (desk-edge strips, ceiling coves, backlighting) — list this SEPARATELY from any ceiling pendant or main light fixture, even if both are visible in the same photo
- set-top boxes, game consoles, soundbars, or other media units sitting below/near a TV
- routers/modems, power strips with visible plugged-in devices, and chargers
- multiple identical fixtures (e.g. two ceiling fans, three monitors) — list each one as its own item rather than merging them into a single entry, unless they are physically one unit (e.g. a single curved ultrawide monitor)

Identify every distinct appliance or fixture you can actually see, including small or partially visible ones — but do not invent items that aren't visible in the photo, and do not double-count the same physical item across multiple photos of the same room.

Respond with ONLY a raw JSON object using EXACTLY this shape, these exact field names, and these exact value types — no other field names, no ranges as strings, no numeric confidence scores:
{
  "detected_items": [
    {
      "category": one of the string values AC, fridge, TV, ceiling_fan, table_fan, tube_light, LED_light, CFL_light, washing_machine, microwave, water_heater, computer, monitor, router, mixer_grinder, iron, other (choose the closest match),
      "description": a short string describing the specific item,
      "visible_label_text": a string of any readable rating plate or brand text visible on the item, or null if none is visible,
      "estimated_wattage_min": an integer — the lower end of a plausible wattage range for this item (a single number, not a range string),
      "estimated_wattage_max": an integer — the upper end of a plausible wattage range for this item (a single number, not a range string),
      "confidence": the exact string "high", "medium", or "low" (never a numeric score),
      "needs_clarification": true or false,
      "clarification_question": a short string question if needs_clarification is true, otherwise null,
      "bounding_box": an array of exactly four numbers [x, y, width, height], each between 0 and 1 as a fraction of the image, or null
    }
  ]
}
Every item must include every field above, using null where noted — never omit a field.`;
