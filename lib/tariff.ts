export type Appliance = {
  id: string;
  name: string;
  category: string;
  wattage: number;
  hours: number;
  note?: string;
};

type Slab = { upto: number; rate: number };
export type TariffPlan = { id: string; label: string; fixedCharge: number; slabs: Slab[] };

// Illustrative residential (domestic) tariffs for a few major Indian states/DISCOMs, expressed as
// simple monthly-equivalent slabs. Real bills also involve sanctioned load, subsidies, surcharges,
// duties and (for some states) bi-monthly billing — actual bills vary by provider. Verify with your
// DISCOM for exact figures; use "Custom rate" below for any other state or if these drift out of date.
export const tariffPlans: Record<string, TariffPlan> = {
  tamil_nadu: {
    id: "tamil_nadu",
    label: "Tamil Nadu (TANGEDCO)",
    fixedCharge: 0,
    slabs: [
      { upto: 100, rate: 0 },
      { upto: 200, rate: 4.7 },
      { upto: 300, rate: 6.3 },
      { upto: 400, rate: 8.4 },
      { upto: Infinity, rate: 11.55 }
    ]
  },
  karnataka: {
    id: "karnataka",
    label: "Karnataka (BESCOM)",
    fixedCharge: 120,
    slabs: [
      { upto: 100, rate: 5.9 },
      { upto: 200, rate: 7.25 },
      { upto: Infinity, rate: 8.6 }
    ]
  },
  maharashtra: {
    id: "maharashtra",
    label: "Maharashtra (MSEDCL)",
    fixedCharge: 110,
    slabs: [
      { upto: 100, rate: 5.2 },
      { upto: 300, rate: 11.1 },
      { upto: Infinity, rate: 15.8 }
    ]
  },
  delhi: {
    id: "delhi",
    label: "Delhi (BSES / Tata Power)",
    fixedCharge: 50,
    slabs: [
      { upto: 200, rate: 3.0 },
      { upto: 400, rate: 4.5 },
      { upto: 800, rate: 6.5 },
      { upto: Infinity, rate: 8.0 }
    ]
  },
  custom: {
    id: "custom",
    label: "Custom rate",
    fixedCharge: 100,
    slabs: [{ upto: Infinity, rate: 8 }]
  }
};

export function monthlyUnits(item: Appliance) {
  return (item.wattage * item.hours * 30) / 1000;
}

export function calculateBill(units: number, tariff: TariffPlan) {
  let previous = 0;
  let energyCharge = 0;
  for (const slab of tariff.slabs) {
    const slabUnits = Math.max(0, Math.min(units, slab.upto) - previous);
    energyCharge += slabUnits * slab.rate;
    previous = slab.upto;
  }
  return { energyCharge, fixedCharge: tariff.fixedCharge, total: energyCharge + tariff.fixedCharge };
}

export function costForItem(item: Appliance, totalUnits: number, energyCharge: number) {
  return totalUnits ? (monthlyUnits(item) / totalUnits) * energyCharge : 0;
}
