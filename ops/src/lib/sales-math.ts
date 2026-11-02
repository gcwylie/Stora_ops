/**
 * Sales maths from web/sales.js.
 * Figures are stored in öre. Labour and wage % always use sales excluding VAT.
 * A Caspeco feed can later write the same SalesDay rows (source = "caspeco"); the views do not care where a day came from.
 */

import { addDays, dayLabel, eachDate, monthName, weekdayName } from "./dates";
import { wagePct } from "./labour";
import { shopFromLegacy, type ShopCode, type ShopView } from "./shops";

export type MoneyOre = { excl: number; incl: number };
export type DayMap = Record<string, Partial<Record<ShopCode, MoneyOre>>>;
export type SalesPeriod = { from: string; to: string; shop: ShopCode; excl: number; incl: number };
export type CostMap = Record<string, Partial<Record<ShopCode | "BOTH", number>>>;

export function parseKr(raw: string): number {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\s/g, "")
    .replace(/kr$/i, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

export function krToOre(kr: number): number {
  return Math.round(kr * 100);
}

export function shopMoney(row: Partial<Record<ShopCode, MoneyOre>> | undefined, shop: ShopView, vat: "excl" | "incl"): number {
  if (!row) return 0;
  const pick = (code: ShopCode) => row[code]?.[vat] || 0;
  if (shop === "both") return pick("SE88") + pick("SIB2");
  return pick(shop);
}

export type MonthBucket = Record<ShopCode, MoneyOre>;

export function emptyMoney(): MoneyOre {
  return { excl: 0, incl: 0 };
}

export function buildMonthIndex(days: DayMap, periods: SalesPeriod[]): Record<string, MonthBucket> {
  const month: Record<string, MonthBucket> = {};
  const ensure = (key: string) => {
    if (!month[key]) {
      month[key] = { SE88: emptyMoney(), SIB2: emptyMoney() };
    }
    return month[key];
  };
  Object.entries(days).forEach(([iso, row]) => {
    const bucket = ensure(iso.slice(0, 7));
    (["SE88", "SIB2"] as ShopCode[]).forEach((code) => {
      bucket[code].excl += row[code]?.excl || 0;
      bucket[code].incl += row[code]?.incl || 0;
    });
  });
  periods.forEach((period) => {
    const bucket = ensure(period.from.slice(0, 7));
    bucket[period.shop].excl += period.excl || 0;
    bucket[period.shop].incl += period.incl || 0;
  });
  return month;
}

export function yearTotal(
  month: Record<string, MonthBucket>,
  year: number,
  shop: ShopView,
  vat: "excl" | "incl",
): number {
  let sum = 0;
  for (let m = 1; m <= 12; m += 1) {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    sum += shopMoney(month[key], shop, vat);
  }
  return sum;
}

export function ytd(days: DayMap, periods: SalesPeriod[], throughIso: string, shop: ShopView, vat: "excl" | "incl"): number {
  const year = throughIso.slice(0, 4);
  let sum = 0;
  Object.entries(days).forEach(([iso, row]) => {
    if (iso <= throughIso && iso.startsWith(year)) sum += shopMoney(row, shop, vat);
  });
  periods.forEach((period) => {
    if (period.to <= throughIso && period.from.startsWith(year)) sum += shopMoney({ [period.shop]: { excl: period.excl, incl: period.incl } }, shop, vat);
  });
  return sum;
}

export function latestDataDay(days: DayMap, today: string): string {
  const year = today.slice(0, 4);
  let latest = "";
  Object.keys(days).forEach((iso) => {
    if (iso.startsWith(year) && iso <= today && iso > latest) latest = iso;
  });
  return latest || addDays(today, -1);
}

export type MonthRow = {
  label: string;
  key: string;
  valuesOre: number[];
  shownOre: number;
  projected: boolean;
  vsPriorPct: number | null;
};

export type RemainRow = {
  iso: string;
  label: string;
  weekday: string;
  history: { iso: string; ore: number }[];
  targetOre: number;
  closed: boolean;
};

export type WageMonth = {
  label: string;
  priorKey: string;
  thisKey: string;
  priorSalesOre: number;
  thisSalesOre: number;
  priorCostKr: number;
  thisCostKr: number;
  priorPct: number | null;
  thisPct: number | null;
};

export type SalesSnapshot = {
  year: number;
  prior: number;
  historyYears: number[];
  through: string;
  today: string;
  vat: "excl" | "incl";
  targetPct: number;
  ytdOre: number;
  lastYtdOre: number;
  ytdPct: number | null;
  yearTargetOre: number;
  remainingNeededOre: number;
  paceOre: number;
  restPct: number | null;
  lastRemainingOre: number;
  remainingCount: number;
  yearStats: { ore: number; label: string }[];
  months: MonthRow[];
  maxMonthOre: number;
  remaining: RemainRow[];
  wageYtdPct: number | null;
  wagePriorPct: number | null;
  wageLastMonth: { key: string; pct: number } | null;
  wageYtdCostKr: number;
  wageMonths: WageMonth[];
};

function staffCost(costs: CostMap, monthKey: string, shop: ShopView): number {
  const row = costs[monthKey] || {};
  if (shop === "both") {
    const split = (row.SE88 || 0) + (row.SIB2 || 0);
    return split || row.BOTH || 0;
  }
  return row[shop] || 0;
}

export function buildSalesSnapshot(input: {
  days: DayMap;
  periods: SalesPeriod[];
  costs: CostMap;
  today: string;
  shop: ShopView;
  vat: "excl" | "incl";
  targetPct: number;
}): SalesSnapshot {
  const { days, periods, costs, today, shop, vat } = input;
  const targetPct = Number(input.targetPct || 0);
  const month = buildMonthIndex(days, periods);
  const year = Number(today.slice(0, 4));
  const prior = year - 1;
  const through = latestDataDay(days, today);
  const historyYears = [year - 3, year - 2, prior, year];
  const ytdOre = ytd(days, periods, through, shop, vat);
  const lastThrough = `${prior}${through.slice(4)}`;
  const lastYtdOre = ytd(days, periods, lastThrough, shop, vat);
  const lastYearOre = yearTotal(month, prior, shop, vat);
  const yearTargetOre = lastYearOre * (1 + targetPct / 100);
  const remainingNeededOre = Math.max(0, yearTargetOre - ytdOre);
  const remainingIsos = eachDate(addDays(through, 1), `${year}-12-31`);
  const lastRemainingOre = remainingIsos.reduce((sum, iso) => {
    const priorIso = `${prior}${iso.slice(4)}`;
    return sum + shopMoney(days[priorIso], shop, vat);
  }, 0);
  const paceOre = remainingIsos.length ? remainingNeededOre / remainingIsos.length : 0;
  const restPct = lastRemainingOre > 0 ? (remainingNeededOre / lastRemainingOre - 1) * 100 : null;
  const ytdPct = lastYtdOre > 0 ? ((ytdOre - lastYtdOre) / lastYtdOre) * 100 : null;

  const yearStats = historyYears.slice(0, 3).map((y, index) => {
    const ore = yearTotal(month, y, shop, vat);
    const prev = index ? yearTotal(month, historyYears[index - 1], shop, vat) : 0;
    const pct = index && prev ? ((ore - prev) / prev) * 100 : null;
    const label =
      index === 0 ? `${y} full year` : `${y} · ${pct == null ? "—" : signedPct(pct)} vs ${historyYears[index - 1]}`;
    return { ore, label };
  });
  yearStats.push({ ore: ytdOre, label: `${year} to ${dayLabel(through)}` });

  let maxMonthOre = 1;
  const months: MonthRow[] = [];
  for (let i = 0; i < 12; i += 1) {
    const mm = String(i + 1).padStart(2, "0");
    const key = `${year}-${mm}`;
    const valuesOre = historyYears.map((y) => shopMoney(month[`${y}-${mm}`], shop, vat));
    valuesOre.forEach((v) => {
      if (v > maxMonthOre) maxMonthOre = v;
    });
    const actual = valuesOre[3];
    const last = valuesOre[2];
    const future = key >= today.slice(0, 7) && actual === 0;
    const projectedOre = future ? last * (1 + targetPct / 100) : actual;
    if (projectedOre > maxMonthOre) maxMonthOre = projectedOre;
    const cmp = future ? projectedOre : actual;
    months.push({
      label: monthName(i),
      key,
      valuesOre,
      shownOre: projectedOre,
      projected: future,
      vsPriorPct: last ? ((cmp - last) / last) * 100 : null,
    });
  }

  const remaining: RemainRow[] = remainingIsos.map((iso) => {
    const history = historyYears.slice(0, 3).map((y) => {
      const histIso = `${y}${iso.slice(4)}`;
      return { iso: histIso, ore: shopMoney(days[histIso], shop, vat) };
    });
    const last = history[2]?.ore || 0;
    return {
      iso,
      label: dayLabel(iso),
      weekday: weekdayName(iso),
      history,
      targetOre: last * (1 + targetPct / 100),
      closed: !last,
    };
  });

  const priorYear = prior;
  const wageMonths: WageMonth[] = [];
  let ytdCost = 0;
  let ytdSales = 0;
  let wageLastMonth: { key: string; pct: number } | null = null;
  for (let i = 0; i < 12; i += 1) {
    const mm = String(i + 1).padStart(2, "0");
    const priorKey = `${priorYear}-${mm}`;
    const thisKey = `${year}-${mm}`;
    const priorSalesOre = shopMoney(month[priorKey], shop, "excl");
    const thisSalesOre = shopMoney(month[thisKey], shop, "excl");
    const priorCostKr = staffCost(costs, priorKey, shop);
    const thisCostKr = staffCost(costs, thisKey, shop);
    const thisPct = wagePct(thisCostKr, thisSalesOre);
    if (thisKey < today.slice(0, 7) && thisCostKr && thisSalesOre && thisPct != null) {
      ytdCost += thisCostKr;
      ytdSales += thisSalesOre;
      wageLastMonth = { key: thisKey, pct: thisPct };
    }
    wageMonths.push({
      label: monthName(i),
      priorKey,
      thisKey,
      priorSalesOre,
      thisSalesOre,
      priorCostKr,
      thisCostKr,
      priorPct: wagePct(priorCostKr, priorSalesOre),
      thisPct,
    });
  }
  let priorCost = 0;
  let priorSales = 0;
  const throughMonth = Number(through.slice(5, 7));
  for (let i = 1; i <= throughMonth; i += 1) {
    const key = `${priorYear}-${String(i).padStart(2, "0")}`;
    const costKr = staffCost(costs, key, shop);
    const salesOre = shopMoney(month[key], shop, "excl");
    if (costKr && salesOre) {
      priorCost += costKr;
      priorSales += salesOre;
    }
  }

  return {
    year,
    prior,
    historyYears,
    through,
    today,
    vat,
    targetPct,
    ytdOre,
    lastYtdOre,
    ytdPct,
    yearTargetOre,
    remainingNeededOre,
    paceOre,
    restPct,
    lastRemainingOre,
    remainingCount: remainingIsos.length,
    yearStats,
    months,
    maxMonthOre,
    remaining,
    wageYtdPct: wagePct(ytdCost, ytdSales),
    wagePriorPct: wagePct(priorCost, priorSales),
    wageLastMonth,
    wageYtdCostKr: ytdCost,
    wageMonths,
  };
}

export function signedPct(n: number | null): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${Math.abs(n).toFixed(1)}%`;
}

type RawSales = {
  days?: Record<string, Record<string, number>>;
  periods?: ({ from: string; to: string } & Record<string, number | string>)[];
  settings?: { yearlyTargetPct?: number };
};

export function parseSalesFile(file: RawSales): {
  days: DayMap;
  periods: SalesPeriod[];
  yearlyTargetPct: number | null;
} {
  const days: DayMap = {};
  Object.entries(file.days || {}).forEach(([iso, row]) => {
    const next: Partial<Record<ShopCode, MoneyOre>> = {};
    Object.entries(row).forEach(([key, value]) => {
      const incl = key.endsWith("_incl");
      const legacy = incl ? key.slice(0, -5) : key;
      const shop = shopFromLegacy(legacy);
      if (!shop || typeof value !== "number") return;
      if (!next[shop]) next[shop] = { excl: 0, incl: 0 };
      next[shop]![incl ? "incl" : "excl"] += value;
    });
    if (Object.keys(next).length) days[iso] = next;
  });
  const periods: SalesPeriod[] = [];
  (file.periods || []).forEach((period) => {
    if (!period.from || !period.to) return;
    (["ostermalm", "vasastan", "SE88", "SIB2"] as string[]).forEach((key) => {
      const shop = shopFromLegacy(key);
      if (!shop) return;
      const excl = Number(period[key] || 0);
      const incl = Number(period[`${key}_incl`] || 0);
      if (!excl && !incl) return;
      const existing = periods.find((row) => row.from === period.from && row.to === period.to && row.shop === shop);
      if (existing) {
        existing.excl += excl;
        existing.incl += incl;
      } else {
        periods.push({ from: String(period.from), to: String(period.to), shop, excl, incl });
      }
    });
  });
  const yearlyTargetPct = file.settings?.yearlyTargetPct != null ? Number(file.settings.yearlyTargetPct) : null;
  return { days, periods, yearlyTargetPct };
}

export function setStaffCost(costs: CostMap, monthKey: string, shop: ShopView, kr: number): CostMap {
  const next: CostMap = { ...costs, [monthKey]: { ...(costs[monthKey] || {}) } };
  const row = next[monthKey]!;
  if (shop === "both") {
    row.BOTH = kr;
    delete row.SE88;
    delete row.SIB2;
  } else {
    row[shop] = kr;
    delete row.BOTH;
  }
  if (!kr && shop === "both") delete row.BOTH;
  if (!kr && shop !== "both") delete row[shop];
  if (!row.SE88 && !row.SIB2 && !row.BOTH) delete next[monthKey];
  return next;
}
