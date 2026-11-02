/**
 * Stock maths from the phone count app.
 * Primary quantity is whole ordering units. A second count converts into those units with alt.f.
 * Value = primary-equivalent units × price per ordering unit.
 * Sanity limits are about quantity. A value cap lowers the bar for expensive items.
 */

export type AltUnit = { u: string; f: number };

export type StockItem = {
  n: number;
  category: string;
  name: string;
  supplier: string;
  sites: string[];
  orderUnit: string;
  primaryUnit: string;
  primaryToBase: number | null;
  baseUnit: string | null;
  perPiece: number | null;
  priceSek: number;
  note: string;
  alts: AltUnit[];
};

export type LineCount = {
  q: number | null;
  a: number | null;
  u: string | null;
  note?: string;
};

export type CategoryLimit = {
  kg?: number | null;
  L?: number | null;
  pcs?: number | null;
  units?: number | null;
  valueCap?: number | null;
};

export type StockRules = {
  limits: Record<string, CategoryLimit>;
  maxUnits: number;
  valueCap: number;
};

export const DEFAULT_LIMITS: Record<string, CategoryLimit> = {
  "1. Fruit & vegetables": { kg: 60, L: 40, pcs: 600 },
  "2. Dairy & cheese": { kg: 50, L: 60, pcs: 400 },
  "3. Meat & fish": { kg: 30, L: 10, pcs: 300 },
  "4. Dry goods & bakery": { kg: 150, L: 60, pcs: 900 },
  "5. Finished bakery products": { kg: 30, L: 10, pcs: 400 },
  "6. Drinks & coffee": { kg: 30, L: 150, pcs: 600 },
  "7. Alcohol": { kg: 5, L: 80, pcs: 300 },
  "8. Packaging & take away": { kg: 100, L: 200, pcs: 5000 },
  "9. Cleaning & hygiene": { kg: 50, L: 60, pcs: 2000 },
  "10. Merchandise": { kg: 50, L: 10, pcs: 1000, units: 800, valueCap: 70000 },
};

export const DEFAULT_RULES: StockRules = {
  limits: DEFAULT_LIMITS,
  maxUnits: 100,
  valueCap: 20000,
};

export const BAKERY_SITES = ["SE88", "SIB2"] as const;

export function counted(count: LineCount | null | undefined): boolean {
  if (!count) return false;
  const hasQty = count.q != null && (count.q as unknown) !== "";
  return Boolean(hasQty || count.a);
}

export function altOf(item: StockItem, unit: string | null | undefined): AltUnit | null {
  if (!item.alts?.length) return null;
  return item.alts.find((alt) => alt.u === unit) || item.alts[0] || null;
}

export function looseInPrimary(item: StockItem, count: LineCount | null | undefined): number {
  if (!count?.a) return 0;
  const alt = altOf(item, count.u);
  return alt ? count.a * alt.f : 0;
}

export function primaryUnits(item: StockItem, count: LineCount | null | undefined): number {
  if (!count) return 0;
  return (count.q || 0) + looseInPrimary(item, count);
}

export function valueOf(item: StockItem, count: LineCount | null | undefined): number {
  if (!count) return 0;
  return primaryUnits(item, count) * item.priceSek;
}

export type BaseTotal = { v: number; u: string };

export function baseTotal(item: StockItem, count: LineCount | null | undefined): BaseTotal | null {
  if (!count) return null;
  const tot = primaryUnits(item, count);
  if (item.primaryToBase) return { v: Math.round(tot * item.primaryToBase * 1000) / 1000, u: item.baseUnit || "" };
  if (item.perPiece) return { v: Math.round(tot * item.perPiece * 10) / 10, u: "pcs" };
  return null;
}

export function tidy(v: number): number {
  if (v >= 100) return Math.round(v);
  if (v >= 10) return Math.round(v * 10) / 10;
  return Math.round(v * 100) / 100;
}

export function capFor(item: StockItem, rules: StockRules): number {
  const limit = rules.limits[item.category];
  return (limit && limit.valueCap) || rules.valueCap || 0;
}

export type AmountLimit = { max: number; u: string; byValue: boolean; catMax: number };

export function limitFor(item: StockItem, rules: StockRules): AmountLimit | null {
  const limit = rules.limits[item.category];
  if (!limit) return null;
  let catMax: number | null = null;
  let unit: string | null = null;
  let perBase: number | null = null;
  if (item.baseUnit === "kg") {
    catMax = limit.kg ?? null;
    unit = "kg";
    perBase = item.primaryToBase ? item.priceSek / item.primaryToBase : null;
  } else if (item.baseUnit === "L") {
    catMax = limit.L ?? null;
    unit = "L";
    perBase = item.primaryToBase ? item.priceSek / item.primaryToBase : null;
  } else if (item.perPiece) {
    catMax = limit.pcs ?? null;
    unit = "pcs";
    perBase = item.priceSek / item.perPiece;
  }
  if (catMax == null || !perBase || !unit) return null;
  const cap = capFor(item, rules);
  let byValue = false;
  let max = catMax;
  if (cap) {
    const byMoney = cap / perBase;
    if (byMoney < max) {
      max = byMoney;
      byValue = true;
    }
  }
  return { max: tidy(max), u: unit, byValue, catMax };
}

export type UnitLimit = { max: number; byValue: boolean };

export function unitLimitFor(item: StockItem, rules: StockRules): UnitLimit {
  const limit = rules.limits[item.category];
  let maxUnits = (limit && limit.units) || rules.maxUnits || 100;
  const cap = capFor(item, rules);
  let byValue = false;
  if (cap && item.priceSek > 0) {
    const byMoney = cap / item.priceSek;
    if (byMoney < maxUnits) {
      maxUnits = byMoney;
      byValue = true;
    }
  }
  return { max: tidy(maxUnits), byValue };
}

export type SanityFlag = {
  kind: "amount" | "units";
  got: number;
  u: string;
  max: number;
  byValue: boolean;
};

export function tooMuch(item: StockItem, count: LineCount | null | undefined, rules: StockRules): SanityFlag | null {
  if (!counted(count) || !count) return null;
  const units = primaryUnits(item, count);
  const lim = limitFor(item, rules);
  const base = baseTotal(item, count);
  if (lim && base && base.u === lim.u && base.v > lim.max) {
    return { kind: "amount", got: base.v, u: base.u, max: lim.max, byValue: lim.byValue };
  }
  const unitLimit = unitLimitFor(item, rules);
  if (units > unitLimit.max) {
    return { kind: "units", got: tidy(units), u: item.primaryUnit, max: unitLimit.max, byValue: unitLimit.byValue };
  }
  return null;
}

export function tooMuchText(item: StockItem, count: LineCount | null | undefined, rules: StockRules): string {
  const flag = tooMuch(item, count, rules);
  if (!flag) return "";
  const head =
    flag.kind === "amount"
      ? `That comes to ${amount(flag.got, flag.u)} of this one item, against the ${amount(flag.max, flag.u)} we would expect.`
      : `That is ${flag.got} ${flag.u} of one item, against the ${flag.max} we would expect.`;
  return (
    head +
    (flag.byValue
      ? " This one is expensive, so the bar sits low — a slip here costs real money. Check it."
      : " Check the number.")
  );
}

export function amount(v: number, unit: string): string {
  const u = String(unit || "");
  if (u.indexOf("box") === 0) return `${Math.round(v * 100) / 100} × ${u}`;
  if (u === "kg" || u === "L") return `${Math.round(v * 1000) / 1000} ${u}`;
  return `${Math.round(v * 10) / 10} ${u}`;
}

export type CountTotals = {
  sum: number;
  done: number;
  total: number;
  byCat: Record<string, number>;
  bySup: Record<string, number>;
  catDone: Record<string, number>;
  catTotal: Record<string, number>;
};

export function countTotals(items: StockItem[], lines: Record<number, LineCount | undefined>): CountTotals {
  const t: CountTotals = { sum: 0, done: 0, total: items.length, byCat: {}, bySup: {}, catDone: {}, catTotal: {} };
  items.forEach((item) => {
    t.catTotal[item.category] = (t.catTotal[item.category] || 0) + 1;
    const line = lines[item.n];
    if (!counted(line)) return;
    t.done += 1;
    t.catDone[item.category] = (t.catDone[item.category] || 0) + 1;
    const value = valueOf(item, line);
    t.sum += value;
    t.byCat[item.category] = (t.byCat[item.category] || 0) + value;
    t.bySup[item.supplier] = (t.bySup[item.supplier] || 0) + value;
  });
  return t;
}

/** Primary units used between two counts. Negative means stock went up (a delivery). */
export function usageBetween(
  item: StockItem,
  previous: LineCount | null | undefined,
  current: LineCount | null | undefined,
): number | null {
  if (!counted(previous) || !counted(current)) return null;
  return primaryUnits(item, previous) - primaryUnits(item, current);
}

/** Suggested order is the usage since the previous count, in ordering units. No par levels exist in the catalogue. */
export function suggestedOrderQty(usage: number | null): number | null {
  if (usage == null) return null;
  return Math.max(0, Math.round(usage * 1000) / 1000);
}

/**
 * Low when the latest count is zero, or on-hand is under half of what was used since the previous count.
 */
export function isLowStock(
  item: StockItem,
  latest: LineCount | null | undefined,
  previous?: LineCount | null,
): boolean {
  if (!counted(latest)) return false;
  const now = primaryUnits(item, latest);
  if (now <= 0) return true;
  const used = usageBetween(item, previous, latest);
  if (used == null || used <= 0) return false;
  return now < used * 0.5;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

type RawAlt = { u?: string; f?: number };
type RawItem = {
  n?: number;
  c?: string;
  i?: string;
  s?: string;
  u?: string[];
  p?: string;
  pu?: string;
  pv?: number | null;
  pb?: string | null;
  pc?: number | null;
  alts?: RawAlt[];
  pr?: number;
  k?: string;
};

export function itemFromRaw(raw: RawItem): StockItem | null {
  if (raw.n == null || !raw.i || !raw.c) return null;
  const sites = (raw.u || []).filter((code) => code === "SE88" || code === "SIB2");
  if (!sites.length) return null;
  return {
    n: raw.n,
    category: raw.c,
    name: raw.i,
    supplier: raw.s || "",
    sites,
    orderUnit: raw.p || raw.pu || "",
    primaryUnit: raw.pu || "",
    primaryToBase: raw.pv ?? null,
    baseUnit: raw.pb ?? null,
    perPiece: raw.pc ?? null,
    priceSek: Number(raw.pr || 0),
    note: raw.k || "",
    alts: (raw.alts || [])
      .filter((alt) => alt.u && alt.f != null)
      .map((alt) => ({ u: String(alt.u), f: Number(alt.f) })),
  };
}

export type CatalogueFile = {
  items?: RawItem[];
  limits?: Record<string, { kg?: number; L?: number; pcs?: number; units?: number; valueCap?: number }>;
  maxUnits?: number;
  valueCap?: number;
};

export function parseCatalogue(file: CatalogueFile): { items: StockItem[]; rules: StockRules; skipped: number } {
  const rawItems = file.items || [];
  const items: StockItem[] = [];
  let skipped = 0;
  rawItems.forEach((raw) => {
    const item = itemFromRaw(raw);
    if (!item) {
      skipped += 1;
      return;
    }
    items.push(item);
  });
  const limits: Record<string, CategoryLimit> = {};
  Object.entries(file.limits || {}).forEach(([category, limit]) => {
    limits[category] = {
      kg: limit.kg ?? null,
      L: limit.L ?? null,
      pcs: limit.pcs ?? null,
      units: limit.units ?? null,
      valueCap: limit.valueCap ?? null,
    };
  });
  return {
    items,
    rules: {
      limits: Object.keys(limits).length ? limits : DEFAULT_LIMITS,
      maxUnits: file.maxUnits ?? DEFAULT_RULES.maxUnits,
      valueCap: file.valueCap ?? DEFAULT_RULES.valueCap,
    },
    skipped,
  };
}
