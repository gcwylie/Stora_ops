import { prisma } from "./db";
import { addDays, asUtcDate, eachDate, formatYmd, lastYearSameWeekday, stockholmToday } from "./dates";
import { dayLabour, sumDays, type LabourSettings } from "./labour";
import type { CostMap, DayMap, SalesPeriod } from "./sales-math";
import { effectiveGroup } from "./shifts";
import type { ShopCode } from "./shops";
import { altOf, type AltUnit, type CategoryLimit, type LineCount, type StockItem, type StockRules } from "./stock-math";

export function dateIsoOf(value: Date): string {
  return formatYmd(value);
}

export async function labourSettings(): Promise<LabourSettings & { yearlyTargetPct: number }> {
  const row = await prisma.labourSettings.findUnique({ where: { id: 1 } });
  return {
    fohAvg: row?.fohAvg ?? 153,
    kitchenAvg: row?.kitchenAvg ?? 153,
    bakeryAvg: row?.bakeryAvg ?? 0,
    targetFohPct: row?.targetFohPct ?? 21,
    semesterPct: row?.semesterPct ?? 12,
    agaPct: row?.agaPct ?? 31.42,
    yearlyTargetPct: row?.yearlyTargetPct ?? 10,
  };
}

export type RosterPerson = {
  id: string;
  name: string;
  groupName: string;
  homeShopCode: string;
  alsoShopCode: string | null;
  active: boolean;
  salary: boolean;
  hourlyRate: number | null;
  caspecoEmployeeId: string | null;
};

export async function roster(): Promise<RosterPerson[]> {
  const rows = await prisma.employee.findMany({ orderBy: { name: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    groupName: row.groupName,
    homeShopCode: row.homeShopCode,
    alsoShopCode: row.alsoShopCode,
    active: row.active,
    salary: row.salary,
    hourlyRate: row.hourlyRate,
    caspecoEmployeeId: row.caspecoEmployeeId,
  }));
}

export type Cell = { employeeId: string; dayIndex: number; shiftId: string; start: string; end: string };

export async function weekCells(shop: ShopCode, monday: string): Promise<Cell[]> {
  const rows = await prisma.scheduleShift.findMany({
    where: { shopCode: shop, weekMonday: asUtcDate(monday) },
  });
  return rows.map((row) => ({
    employeeId: row.employeeId,
    dayIndex: row.dayIndex,
    shiftId: row.shiftId,
    start: row.startTime,
    end: row.endTime,
  }));
}

export async function salesMap(): Promise<{ days: DayMap; periods: SalesPeriod[]; costs: CostMap }> {
  const [days, periods, costs] = await Promise.all([
    prisma.salesDay.findMany(),
    prisma.salesPeriod.findMany(),
    prisma.staffCostMonth.findMany(),
  ]);
  const dayMap: DayMap = {};
  days.forEach((row) => {
    const iso = formatYmd(row.date);
    if (row.shopCode !== "SE88" && row.shopCode !== "SIB2") return;
    if (!dayMap[iso]) dayMap[iso] = {};
    dayMap[iso][row.shopCode] = { excl: row.exclOre, incl: row.inclOre };
  });
  const periodRows: SalesPeriod[] = periods
    .filter((row) => row.shopCode === "SE88" || row.shopCode === "SIB2")
    .map((row) => ({
      from: formatYmd(row.fromDate),
      to: formatYmd(row.toDate),
      shop: row.shopCode as ShopCode,
      excl: row.exclOre,
      incl: row.inclOre,
    }));
  const costMap: CostMap = {};
  costs.forEach((row) => {
    if (row.shopCode !== "SE88" && row.shopCode !== "SIB2" && row.shopCode !== "BOTH") return;
    costMap[row.month] = { ...(costMap[row.month] || {}), [row.shopCode]: row.costKr };
  });
  return { days: dayMap, periods: periodRows, costs: costMap };
}

export function daySalesKr(days: DayMap, iso: string, shop: ShopCode): { thisKr: number; lastKr: number; lastIso: string } {
  const lastIso = lastYearSameWeekday(iso);
  return {
    thisKr: (days[iso]?.[shop]?.excl || 0) / 100,
    lastKr: (days[lastIso]?.[shop]?.excl || 0) / 100,
    lastIso,
  };
}

export function labourForRange(input: {
  shop: ShopCode;
  from: string;
  to: string;
  cells: { iso: string; group: string; hours: number; hourlyRate: number | null; salary: boolean }[];
  days: DayMap;
  settings: LabourSettings;
  yearTargetPct: number;
}) {
  const dates = eachDate(input.from, input.to);
  const built = dates.map((iso) => {
    const people = input.cells
      .filter((cell) => cell.iso === iso)
      .map((cell) => ({
        group: cell.group,
        hours: cell.hours,
        hourlyOverride: cell.hourlyRate,
        salary: cell.salary,
      }));
    return dayLabour(people, daySalesKr(input.days, iso, input.shop), input.settings, input.yearTargetPct);
  });
  return { days: built, totals: sumDays(built) };
}

export async function shiftsInRange(shop: ShopCode, fromMonday: string, toMonday: string, people: RosterPerson[]) {
  const rows = await prisma.scheduleShift.findMany({
    where: { shopCode: shop, weekMonday: { gte: asUtcDate(fromMonday), lte: asUtcDate(toMonday) } },
  });
  const byId = new Map(people.map((person) => [person.id, person]));
  return rows.flatMap((row) => {
    const person = byId.get(row.employeeId);
    if (!person) return [];
    const start = row.startTime;
    const end = row.endTime;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins < 0) mins += 24 * 60;
    return [
      {
        iso: addDays(formatYmd(row.weekMonday), row.dayIndex),
        group: effectiveGroup(shop, person.groupName),
        hours: mins / 60,
        hourlyRate: person.hourlyRate,
        salary: person.salary,
      },
    ];
  });
}

export function toStockItem(row: {
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
  alts: unknown;
}): StockItem {
  const alts: AltUnit[] = Array.isArray(row.alts)
    ? row.alts
        .map((alt) => {
          const record = alt as { u?: string; f?: number };
          return record.u && record.f != null ? { u: String(record.u), f: Number(record.f) } : null;
        })
        .filter((alt): alt is AltUnit => Boolean(alt))
    : [];
  return {
    n: row.n,
    category: row.category,
    name: row.name,
    supplier: row.supplier,
    sites: row.sites,
    orderUnit: row.orderUnit,
    primaryUnit: row.primaryUnit,
    primaryToBase: row.primaryToBase,
    baseUnit: row.baseUnit,
    perPiece: row.perPiece,
    priceSek: row.priceSek,
    note: row.note,
    alts,
  };
}

export async function stockRules(): Promise<StockRules> {
  const [limits, settings] = await Promise.all([
    prisma.categoryLimit.findMany(),
    prisma.stockSettings.findUnique({ where: { id: 1 } }),
  ]);
  const map: Record<string, CategoryLimit> = {};
  limits.forEach((row) => {
    map[row.category] = { kg: row.kg, L: row.litres, pcs: row.pcs, units: row.units, valueCap: row.valueCap };
  });
  return {
    limits: map,
    maxUnits: settings?.maxUnits ?? 100,
    valueCap: settings?.valueCap ?? 20000,
  };
}

export async function overdueDays(): Promise<number> {
  const settings = await prisma.stockSettings.findUnique({ where: { id: 1 } });
  return settings?.countOverdueDays ?? 7;
}

export function lineFromRow(row: {
  qty: number | null;
  altQty: number | null;
  altUnit: string | null;
  note: string;
  ack: boolean;
}): LineCount & { ack: boolean } {
  return { q: row.qty, a: row.altQty, u: row.altUnit, note: row.note, ack: row.ack };
}

export async function catalogueFor(shop: ShopCode): Promise<StockItem[]> {
  const rows = await prisma.catalogueItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return rows.map(toStockItem).filter((item) => item.sites.includes(shop));
}

export function defaultAlt(item: StockItem, unit: string | null): string {
  return altOf(item, unit)?.u || item.alts[0]?.u || "";
}

export function todayIso(): string {
  return stockholmToday();
}
