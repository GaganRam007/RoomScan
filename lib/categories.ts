export const applianceCategories = [
  "AC", "fridge", "TV", "ceiling_fan", "table_fan", "tube_light", "LED_light", "CFL_light",
  "washing_machine", "microwave", "water_heater", "computer", "monitor", "router", "mixer_grinder", "iron", "other"
] as const;

export type ApplianceCategory = (typeof applianceCategories)[number];

type CategoryMeta = { label: string; icon: string; defaultHours: number; defaultWattage: number };

// defaultHours is an "equivalent hours at rated wattage per day" simplification (e.g. a fridge
// cycles its compressor, so 8 "full power" hours approximates a day of intermittent running).
export const categoryMeta: Record<ApplianceCategory, CategoryMeta> = {
  AC: { label: "Air conditioner", icon: "❄", defaultHours: 8, defaultWattage: 1500 },
  fridge: { label: "Refrigerator", icon: "▥", defaultHours: 8, defaultWattage: 150 },
  TV: { label: "Television", icon: "▭", defaultHours: 4, defaultWattage: 100 },
  ceiling_fan: { label: "Ceiling fan", icon: "✣", defaultHours: 10, defaultWattage: 75 },
  table_fan: { label: "Table fan", icon: "✣", defaultHours: 6, defaultWattage: 55 },
  tube_light: { label: "Tube light", icon: "▮", defaultHours: 6, defaultWattage: 36 },
  LED_light: { label: "LED light", icon: "✦", defaultHours: 6, defaultWattage: 10 },
  CFL_light: { label: "CFL light", icon: "✦", defaultHours: 6, defaultWattage: 18 },
  washing_machine: { label: "Washing machine", icon: "◍", defaultHours: 1, defaultWattage: 500 },
  microwave: { label: "Microwave", icon: "▦", defaultHours: 0.5, defaultWattage: 1200 },
  water_heater: { label: "Water heater / geyser", icon: "♨", defaultHours: 1, defaultWattage: 2000 },
  computer: { label: "Computer / PC", icon: "⌁", defaultHours: 6, defaultWattage: 200 },
  monitor: { label: "Monitor", icon: "▭", defaultHours: 6, defaultWattage: 40 },
  router: { label: "Wi-Fi router", icon: "◌", defaultHours: 24, defaultWattage: 10 },
  mixer_grinder: { label: "Mixer grinder", icon: "◈", defaultHours: 0.25, defaultWattage: 500 },
  iron: { label: "Iron box", icon: "▱", defaultHours: 0.5, defaultWattage: 1000 },
  other: { label: "Other", icon: "⌁", defaultHours: 2, defaultWattage: 100 }
};

export function metaFor(category: string): CategoryMeta {
  return (categoryMeta as Record<string, CategoryMeta>)[category] ?? categoryMeta.other;
}
