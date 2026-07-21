"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { applianceCategories, categoryMeta, metaFor } from "../lib/categories";
import { Appliance, TariffPlan, calculateBill, costForItem, monthlyUnits, tariffPlans } from "../lib/tariff";

type DetectedItem = {
  category: string;
  description: string;
  estimated_wattage_min: number;
  estimated_wattage_max: number;
  needs_clarification: boolean;
  clarification_question: string | null;
};

const defaults: { category: string; wattage: number; hours: number }[] = [
  { category: "ceiling_fan", wattage: 75, hours: 10 },
  { category: "LED_light", wattage: 10, hours: 6 },
  { category: "fridge", wattage: 150, hours: 8 }
];
const palette = ["#d9f99d", "#a5f3fc", "#fef08a", "#fecdd3", "#ddd6fe"];
const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const STORAGE_KEY = "roomscan:v1";

function defaultItems(): Appliance[] {
  return defaults.map((item, index) => ({
    id: String(index), name: metaFor(item.category).label, category: item.category, wattage: item.wattage, hours: item.hours
  }));
}

function csvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

export default function Home() {
  const [items, setItems] = useState<Appliance[]>(defaultItems());
  const [hasScanned, setHasScanned] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; url: string }[]>([]);
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "error">("idle");
  const [scanError, setScanError] = useState("");
  const [stateKey, setStateKey] = useState("tamil_nadu");
  const [customRate, setCustomRate] = useState(8);
  const [customFixed, setCustomFixed] = useState(100);
  const [loaded, setLoaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  // Load any previously saved inventory once on mount (browser-only; skipped during server render).
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.items) && parsed.items.length) setItems(parsed.items);
        if (typeof parsed.hasScanned === "boolean") setHasScanned(parsed.hasScanned);
        if (typeof parsed.stateKey === "string") setStateKey(parsed.stateKey);
        if (typeof parsed.customRate === "number") setCustomRate(parsed.customRate);
        if (typeof parsed.customFixed === "number") setCustomFixed(parsed.customFixed);
      }
    } catch { /* corrupt or unavailable storage — start fresh */ }
    setLoaded(true);
  }, []);

  // Persist after the initial load completes, so we don't immediately overwrite saved data
  // with the pre-load default state.
  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ items, hasScanned, stateKey, customRate, customFixed }));
    } catch { /* private browsing / storage disabled — persistence is best-effort */ }
  }, [items, hasScanned, stateKey, customRate, customFixed, loaded]);

  const tariff: TariffPlan = useMemo(() => {
    if (stateKey === "custom") return { id: "custom", label: "Custom rate", fixedCharge: customFixed, slabs: [{ upto: Infinity, rate: customRate }] };
    return tariffPlans[stateKey] ?? tariffPlans.tamil_nadu;
  }, [stateKey, customRate, customFixed]);

  const totalUnits = useMemo(() => items.reduce((sum, item) => sum + monthlyUnits(item), 0), [items]);
  const bill = useMemo(() => calculateBill(totalUnits, tariff), [totalUnits, tariff]);
  const ranked = useMemo(() => [...items].map((item) => ({ ...item, units: monthlyUnits(item), cost: costForItem(item, totalUnits, bill.energyCharge) })).sort((a, b) => b.cost - a.cost), [items, totalUnits, bill.energyCharge]);
  const needsReviewCount = items.filter((item) => item.note).length;

  useEffect(() => () => { photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)); }, []);

  const update = (id: string, field: "name" | "category" | "wattage" | "hours", value: string | number) => setItems((current) => current.map((item) => {
    if (item.id !== id) return item;
    if (field === "wattage") return { ...item, wattage: Math.min(10000, Math.max(1, Number(value) || 1)) };
    if (field === "hours") return { ...item, hours: Math.min(24, Math.max(0, Number(value) || 0)) };
    return { ...item, [field]: value };
  }));
  const addItem = () => setItems((current) => [...current, { id: crypto.randomUUID(), name: categoryMeta.other.label, category: "other", wattage: categoryMeta.other.defaultWattage, hours: categoryMeta.other.defaultHours }]);
  const removeItem = (id: string) => setItems((current) => current.filter((entry) => entry.id !== id));

  const resetAll = () => {
    try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* best-effort */ }
    photosRef.current.forEach((p) => URL.revokeObjectURL(p.url));
    setPhotos([]); setItems(defaultItems()); setHasScanned(false);
    setStateKey("tamil_nadu"); setCustomRate(8); setCustomFixed(100);
    setScanStatus("idle"); setScanError("");
  };

  const exportCsv = () => {
    const header = ["Name", "Category", "Watts", "Hours/day", "Monthly kWh", "Monthly cost (INR)"];
    const rows = ranked.map((item) => [item.name, metaFor(item.category).label, item.wattage, item.hours, item.units.toFixed(2), item.cost.toFixed(2)]);
    const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
    lines.push("");
    lines.push([csvCell("Tariff"), csvCell(tariff.label)].join(","));
    lines.push([csvCell("Total monthly units (kWh)"), csvCell(totalUnits.toFixed(2))].join(","));
    lines.push([csvCell("Fixed charge"), csvCell(bill.fixedCharge)].join(","));
    lines.push([csvCell("Energy charge"), csvCell(bill.energyCharge.toFixed(2))].join(","));
    lines.push([csvCell("Total estimated monthly bill"), csvCell(bill.total.toFixed(2))].join(","));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "roomscan-estimate.csv"; link.click();
    URL.revokeObjectURL(url);
  };

  const photosChanged = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    const room = Math.max(0, MAX_PHOTOS - photos.length);
    const withinRoom = selected.slice(0, room);
    const fitSize = withinRoom.filter((f) => f.size <= MAX_PHOTO_BYTES);
    const skipped = selected.length - fitSize.length;
    const next = fitSize.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPhotos((current) => [...current, ...next]);
    setScanStatus("idle");
    setScanError(skipped > 0 ? `Up to ${MAX_PHOTOS} photos, 10 MB each — ${skipped} photo${skipped > 1 ? "s" : ""} skipped.` : "");
  };
  const removePhoto = (index: number) => setPhotos((current) => {
    URL.revokeObjectURL(current[index].url);
    return current.filter((_, i) => i !== index);
  });

  const runScan = async () => {
    if (!photos.length) return inputRef.current?.click();
    setScanStatus("scanning"); setScanError("");
    const data = new FormData();
    photos.forEach((p) => data.append("photos", p.file));
    try {
      const response = await fetch("/api/detect", { method: "POST", body: data });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Scan failed");
      const detected: DetectedItem[] = result.detected_items ?? [];
      if (!detected.length) { setScanStatus("error"); setScanError("No appliances were confidently identified. Try a clearer photo or add items manually."); return; }
      const mapped: Appliance[] = detected.map((item, index) => {
        const meta = metaFor(item.category);
        return {
          id: `${Date.now()}-${index}`,
          name: item.description || meta.label,
          category: item.category,
          wattage: Math.round((item.estimated_wattage_min + item.estimated_wattage_max) / 2),
          hours: meta.defaultHours,
          note: item.needs_clarification ? item.clarification_question ?? undefined : undefined
        };
      });
      setItems((current) => (hasScanned ? [...current, ...mapped] : mapped));
      setHasScanned(true);
      document.getElementById("inventory")?.scrollIntoView({ behavior: "smooth" });
      setScanStatus("idle");
    } catch (error) { setScanStatus("error"); setScanError(error instanceof Error ? error.message : "Scan failed"); }
  };
  const top = ranked[0];
  const savings = top ? top.cost * 0.2 : 0;

  return <main>
    <nav><div className="brand"><span className="brand-mark">⌁</span> RoomScan</div><span className="beta">BETA</span><a href="#estimate">Your estimate</a></nav>
    <section className="hero">
      <div className="hero-copy"><p className="eyebrow">ELECTRICITY, MADE VISIBLE</p><h1>See what your room<br /><em>really costs.</em></h1><p className="lede">Build a quick appliance inventory, then get a clear monthly energy estimate and practical ways to lower it.</p><div className="hero-actions"><button disabled={scanStatus === "scanning"} onClick={runScan}>{scanStatus === "scanning" ? "Analysing room…" : photos.length ? "Analyse this room" : "Scan a room"} <span>↗</span></button><a href="#inventory">or enter manually ↓</a></div>
        {photos.length > 0 && <div className="photo-strip">
          {photos.map((p, index) => <div className="photo-chip" key={p.url}><img src={p.url} alt={`Room photo ${index + 1}`} /><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>×</button></div>)}
          {photos.length < MAX_PHOTOS && <button type="button" className="add-photo-chip" onClick={() => inputRef.current?.click()}>+ Add</button>}
        </div>}
        <p className="fine">Photos are analysed only to identify appliances. {scanError && <b className="scan-error">{scanError}</b>}</p>
      </div>
      <div className="hero-card"><div className="scan-corner tl" /><div className="scan-corner tr" /><div className="scan-corner bl" /><div className="scan-corner br" />{photos[0] ? <img src={photos[0].url} alt="Selected room" /> : <><div className="orb orb-one" /><div className="orb orb-two" /><div className="room-art"><span>▱</span><span>◒</span><span>⌑</span></div></>}<div className="scan-tag"><i /> ROOM READY <b>{photos.length ? `${photos.length}/${MAX_PHOTOS} PHOTO${photos.length > 1 ? "S" : ""} ADDED` : "ADD 1–3 PHOTOS"}</b></div><input ref={inputRef} className="hidden" type="file" accept="image/*" capture="environment" multiple onChange={photosChanged} /></div>
    </section>
    <section id="inventory" className="inventory"><div className="section-head"><div><p className="eyebrow">YOUR ROOM INVENTORY</p><h2>What&apos;s using power?</h2>{needsReviewCount > 0 && <p className="review-note">{needsReviewCount} item{needsReviewCount > 1 ? "s" : ""} could use a quick check — see the notes below.</p>}</div><div className="head-actions"><button className="outline" onClick={addItem}>+ Add appliance</button><button className="text-link" onClick={resetAll}>Reset</button></div></div><div className="item-grid">{items.map((item, index) => <article className="item" key={item.id}><div className="item-icon" style={{ background: palette[index % palette.length] }}>{metaFor(item.category).icon}</div><div className="item-fields"><input aria-label="Appliance name" value={item.name} onChange={(e) => update(item.id, "name", e.target.value)} /><select aria-label="Appliance category" value={item.category} onChange={(e) => update(item.id, "category", e.target.value)}>{applianceCategories.map((cat) => <option key={cat} value={cat}>{categoryMeta[cat].label}</option>)}</select>{item.note && <span className="item-note">? {item.note}</span>}</div><div className="number"><input aria-label="Watts" type="number" min="1" value={item.wattage} onChange={(e) => update(item.id, "wattage", Number(e.target.value))} /><span>W</span></div><div className="number"><input aria-label="Hours per day" type="number" min="0" max="24" step="0.5" value={item.hours} onChange={(e) => update(item.id, "hours", Number(e.target.value))} /><span>hrs/day</span></div><button className="remove" aria-label={`Remove ${item.name}`} onClick={() => removeItem(item.id)}>×</button></article>)}</div></section>
    <section id="estimate" className="estimate"><div className="estimate-summary"><p className="eyebrow">MONTHLY ESTIMATE</p><h2>{money.format(bill.total)}<small>/ month</small></h2><p>Based on <strong>{totalUnits.toFixed(0)} kWh</strong> per month and a {tariff.label} residential tariff.</p>
      <div className="tariff-picker"><label htmlFor="tariff-select">Tariff / state</label><select id="tariff-select" value={stateKey} onChange={(e) => setStateKey(e.target.value)}>{Object.values(tariffPlans).map((plan) => <option key={plan.id} value={plan.id}>{plan.label}</option>)}</select>
        {stateKey === "custom" && <div className="custom-tariff"><label>₹/unit<input type="number" min="0" step="0.1" value={customRate} onChange={(e) => setCustomRate(Math.max(0, Number(e.target.value) || 0))} /></label><label>Fixed charge ₹<input type="number" min="0" value={customFixed} onChange={(e) => setCustomFixed(Math.max(0, Number(e.target.value) || 0))} /></label></div>}
      </div>
      <div className="meter"><span style={{ width: `${Math.min(100, totalUnits / 4)}%` }} /></div><div className="meter-label"><span>0 kWh</span><span>{totalUnits.toFixed(0)} kWh</span><span>Higher use</span></div><p className="disclaimer">Includes {money.format(bill.fixedCharge)} fixed charge. Illustrative slabs — actual bills vary by provider, sanctioned load, taxes and meter readings.</p></div><div className="breakdown"><div className="breakdown-title"><h3>Where it goes</h3><span>{money.format(bill.energyCharge)} energy charge</span><button className="text-link" onClick={exportCsv}>⬇ Export CSV</button></div>{ranked.map((item, index) => <div className="bar-row" key={item.id}><div><b>{item.name}</b><span>{item.units.toFixed(1)} kWh</span></div><div className="bar"><i style={{ width: `${Math.max(5, (item.cost / Math.max(1, ranked[0]?.cost || 1)) * 100)}%`, background: palette[index % palette.length] }} /></div><strong>{money.format(item.cost)}</strong></div>)}</div></section>
    <section className="tips"><div><p className="eyebrow">A SMALLER FOOTPRINT</p><h2>A little less,<br /><em>adds up.</em></h2></div><article className="tip"><span className="leaf">↯</span><div><p>Most effective next step</p><h3>{top ? `Use ${top.name.toLowerCase()} 20% less` : "Add an appliance"}</h3><span>{top ? `Save about ${money.format(savings)}/month and avoid ${(top.units * 0.2 * 0.82).toFixed(1)} kg CO₂.` : "Your personalised recommendations will appear here."}</span></div><b>{top ? money.format(savings) : "—"}<small>/mo</small></b></article></section>
    <footer><span>ROOMSCAN</span><span>Built for more mindful energy use.</span></footer>
  </main>;
}
