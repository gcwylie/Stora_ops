/**
 * Labour maths from the local planner (web/planner.js).
 * Cost adds 12% holiday pay (semesterersättning) and 31.42% employer social fees (arbetsgivaravgifter).
 * Labour % is FOH + kitchen only. Bakery and admin sit outside that percentage.
 * Target FOH hours = target sales × target FOH % ÷ loaded FOH kr/h.
 */

export type LabourSettings = {
  fohAvg: number;
  kitchenAvg: number;
  bakeryAvg: number;
  targetFohPct: number;
  semesterPct: number;
  agaPct: number;
};

export const DEFAULT_LABOUR: LabourSettings = {
  fohAvg: 153,
  kitchenAvg: 153,
  bakeryAvg: 0,
  targetFohPct: 21,
  semesterPct: 12,
  agaPct: 31.42,
};

export type LabourBucket = "foh" | "kitchen" | "bakery" | "admin";

export type RatePerson = {
  group: string;
  hourlyOverride?: number | null;
  salary?: boolean;
};

export function loadFactor(settings: Pick<LabourSettings, "semesterPct" | "agaPct"> = DEFAULT_LABOUR): number {
  const semester = 1 + Number(settings.semesterPct ?? 12) / 100;
  const aga = 1 + Number(settings.agaPct ?? 31.42) / 100;
  return semester * aga;
}

export function labourBucket(group: string): LabourBucket {
  if (group === "Kitchen") return "kitchen";
  if (group === "Bakery") return "bakery";
  if (group === "Admin") return "admin";
  return "foh";
}

export function deptAvg(group: string, settings: LabourSettings): number {
  if (group === "Kitchen") return Number(settings.kitchenAvg || 0);
  if (group === "Bakery") return Number(settings.bakeryAvg || 0);
  return Number(settings.fohAvg || 0);
}

export function baseHourly(person: RatePerson, settings: LabourSettings): number {
  const override = Number(person.hourlyOverride || 0);
  if (override > 0) return override;
  if (person.salary) return 0;
  return deptAvg(person.group, settings);
}

export function loadedHourly(person: RatePerson, settings: LabourSettings): number {
  return baseHourly(person, settings) * loadFactor(settings);
}

export function hoursFromTimes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  if (![startH, startM, endH, endM].every((n) => Number.isFinite(n))) return 0;
  let mins = endH * 60 + endM - (startH * 60 + startM);
  if (mins < 0) mins += 24 * 60;
  return mins / 60;
}

export function parseClock(raw: string): string {
  const text = String(raw || "")
    .trim()
    .replace(".", ":")
    .replace(";", ":");
  const match = text.match(/^(\d{1,2})(?::(\d{2}))?$/);
  if (!match) return "";
  const hour = Number(match[1]);
  const minute = Number(match[2] || "0");
  if (hour > 23 || minute > 59) return "";
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export type DaySales = { thisKr: number; lastKr: number };

export function salesUsed(sales: DaySales): { thisKr: number; lastKr: number; used: number; lastYear: boolean } {
  const thisKr = sales.thisKr || 0;
  const lastKr = sales.lastKr || 0;
  return { thisKr, lastKr, used: thisKr || lastKr, lastYear: !thisKr && lastKr > 0 };
}

export type PersonHours = RatePerson & { hours: number };

export type DayLabour = {
  hours: Record<LabourBucket, number>;
  cost: Record<LabourBucket, number>;
  fohCost: number;
  kitCost: number;
  bakeCost: number;
  adminCost: number;
  shopCost: number;
  totalCost: number;
  sales: ReturnType<typeof salesUsed>;
  targetSales: number;
  targetHours: number;
};

export function dayLabour(
  people: PersonHours[],
  sales: DaySales,
  settings: LabourSettings,
  yearTargetPct: number,
): DayLabour {
  const hours: Record<LabourBucket, number> = { foh: 0, kitchen: 0, bakery: 0, admin: 0 };
  const cost: Record<LabourBucket, number> = { foh: 0, kitchen: 0, bakery: 0, admin: 0 };
  people.forEach((person) => {
    if (!person.hours) return;
    const bucket = labourBucket(person.group);
    const personCost = person.hours * loadedHourly(person, settings);
    hours[bucket] += person.hours;
    cost[bucket] += personCost;
  });
  const used = salesUsed(sales);
  const grow = 1 + Number(yearTargetPct || 0) / 100;
  const targetSales = (used.lastKr || used.thisKr) * grow;
  const targetPct = Number(settings.targetFohPct || 0) / 100;
  const fohLoaded = Number(settings.fohAvg || 0) * loadFactor(settings);
  const targetHours = fohLoaded && targetPct ? (targetSales * targetPct) / fohLoaded : 0;
  const shopCost = cost.foh + cost.kitchen;
  return {
    hours,
    cost,
    fohCost: cost.foh,
    kitCost: cost.kitchen,
    bakeCost: cost.bakery,
    adminCost: cost.admin,
    shopCost,
    totalCost: shopCost + cost.bakery + cost.admin,
    sales: used,
    targetSales,
    targetHours,
  };
}

export type SheetTotals = {
  hours: Record<LabourBucket, number>;
  fohCost: number;
  kitCost: number;
  bakeCost: number;
  adminCost: number;
  shopCost: number;
  totalCost: number;
  used: number;
  lastKr: number;
  thisKr: number;
  targetSales: number;
  targetHours: number;
  labourPct: number | null;
  fohPct: number | null;
  bakePct: number | null;
};

export function sumDays(days: DayLabour[]): SheetTotals {
  const tot: SheetTotals = {
    hours: { foh: 0, kitchen: 0, bakery: 0, admin: 0 },
    fohCost: 0,
    kitCost: 0,
    bakeCost: 0,
    adminCost: 0,
    shopCost: 0,
    totalCost: 0,
    used: 0,
    lastKr: 0,
    thisKr: 0,
    targetSales: 0,
    targetHours: 0,
    labourPct: null,
    fohPct: null,
    bakePct: null,
  };
  days.forEach((day) => {
    (Object.keys(tot.hours) as LabourBucket[]).forEach((key) => {
      tot.hours[key] += day.hours[key];
    });
    tot.fohCost += day.fohCost;
    tot.kitCost += day.kitCost;
    tot.bakeCost += day.bakeCost;
    tot.adminCost += day.adminCost;
    tot.shopCost += day.shopCost;
    tot.totalCost += day.totalCost;
    tot.used += day.sales.used;
    tot.lastKr += day.sales.lastKr;
    tot.thisKr += day.sales.thisKr;
    tot.targetSales += day.targetSales;
    tot.targetHours += day.targetHours;
  });
  tot.labourPct = ratio(tot.shopCost, tot.used);
  tot.fohPct = ratio(tot.fohCost, tot.used);
  tot.bakePct = ratio(tot.bakeCost, tot.used);
  return tot;
}

export function ratio(cost: number, sales: number): number | null {
  if (!cost || !sales) return null;
  return cost / sales;
}

/** True when cost/sales is within the target plus one percentage point, matching the planner. */
export function withinTarget(cost: number, sales: number, targetPctPoints: number): boolean | null {
  const target = Number(targetPctPoints || 0) / 100;
  if (!sales || !target) return null;
  return cost / sales <= target + 0.01;
}

export function wagePct(costKr: number, salesOre: number): number | null {
  if (!costKr || !salesOre) return null;
  return (costKr / (salesOre / 100)) * 100;
}

export const FOH_BUCKETS: Record<string, string> = {
  "foh-open": "open",
  "foh-pm": "pm",
  "pm-runner": "pmRunner",
  "pm-runner-late": "pmRunnerLate",
  "pm-close": "pmClose",
  "runner-am": "amRunner",
};

export const FOH_COVERAGE = [
  { key: "open", label: "FOH OPEN", weekday: 1, weekend: 1 },
  { key: "pm", label: "FOH PM", weekday: 1, weekend: 3 },
  { key: "pmRunner", label: "PM 08–17", weekday: 1, weekend: 1 },
  { key: "pmRunnerLate", label: "PM 11–17", weekday: 1, weekend: 1 },
  { key: "pmClose", label: "PM CLOSE", weekday: 2, weekend: 2 },
  { key: "amRunner", label: "AM RUNNER", weekday: 1, weekend: 1 },
] as const;

export function fohNeeded(dayIndex: number): Record<string, number> {
  const weekend = dayIndex >= 4;
  const needed: Record<string, number> = { extra: 0 };
  FOH_COVERAGE.forEach((row) => {
    needed[row.key] = weekend ? row.weekend : row.weekday;
  });
  return needed;
}

export function fohBucketFor(shiftId: string): string {
  if (!shiftId || shiftId === "off") return "";
  return FOH_BUCKETS[shiftId] || "extra";
}
