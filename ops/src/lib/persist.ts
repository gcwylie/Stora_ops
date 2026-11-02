import bcrypt from "bcryptjs";
import type { PrismaClient } from "@prisma/client";
import { asUtcDate } from "./dates";
import { parseEmployeesFile, parseRatesFile, type EmployeeImport, type RatesImport } from "./import-parse";
import { DEFAULT_LABOUR } from "./labour";
import { parseSalesFile } from "./sales-math";
import { parseCatalogue, type CatalogueFile } from "./stock-math";

export async function importSalesJson(prisma: PrismaClient, json: unknown, source = "import") {
  const parsed = parseSalesFile(json as Parameters<typeof parseSalesFile>[0]);
  for (const [iso, row] of Object.entries(parsed.days)) {
    for (const shop of ["SE88", "SIB2"] as const) {
      const money = row[shop];
      if (!money) continue;
      await prisma.salesDay.upsert({
        where: { date_shopCode: { date: asUtcDate(iso), shopCode: shop } },
        create: { date: asUtcDate(iso), shopCode: shop, exclOre: money.excl, inclOre: money.incl, source },
        update: { exclOre: money.excl, inclOre: money.incl, source },
      });
    }
  }
  for (const period of parsed.periods) {
    await prisma.salesPeriod.upsert({
      where: {
        fromDate_toDate_shopCode: { fromDate: asUtcDate(period.from), toDate: asUtcDate(period.to), shopCode: period.shop },
      },
      create: {
        fromDate: asUtcDate(period.from),
        toDate: asUtcDate(period.to),
        shopCode: period.shop,
        exclOre: period.excl,
        inclOre: period.incl,
        source,
      },
      update: { exclOre: period.excl, inclOre: period.incl, source },
    });
  }
  if (parsed.yearlyTargetPct != null) {
    await prisma.labourSettings.upsert({
      where: { id: 1 },
      create: { id: 1, yearlyTargetPct: parsed.yearlyTargetPct },
      update: { yearlyTargetPct: parsed.yearlyTargetPct },
    });
  }
  return { days: Object.keys(parsed.days).length, periods: parsed.periods.length };
}

export async function importEmployeesJson(prisma: PrismaClient, json: unknown) {
  const rows = parseEmployeesFile(json);
  let updated = 0;
  let created = 0;
  for (const row of rows) {
    const existing = await prisma.employee.findFirst({ where: { name: row.name } });
    if (existing) {
      await prisma.employee.update({
        where: { id: existing.id },
        data: employeeData(row, existing.homeShopCode),
      });
      updated += 1;
    } else {
      await prisma.employee.create({
        data: {
          name: row.name,
          groupName: row.group || "FOH",
          homeShopCode: row.shop && row.shop !== "UNASSIGNED" ? row.shop : "UNASSIGNED",
          alsoShopCode: row.alsoShop || null,
          salary: Boolean(row.salary),
          hourlyRate: row.hourlyRate ?? null,
          caspecoEmployeeId: row.caspecoId || null,
        },
      });
      created += 1;
    }
  }
  return { updated, created, total: rows.length };
}

function employeeData(row: EmployeeImport, currentShop: string) {
  return {
    ...(row.group ? { groupName: row.group } : {}),
    ...(row.shop ? { homeShopCode: row.shop === "UNASSIGNED" ? "UNASSIGNED" : row.shop } : { homeShopCode: currentShop }),
    ...(row.alsoShop !== undefined ? { alsoShopCode: row.alsoShop } : {}),
    ...(row.salary !== undefined ? { salary: row.salary } : {}),
    ...(row.hourlyRate !== undefined ? { hourlyRate: row.hourlyRate } : {}),
    ...(row.caspecoId ? { caspecoEmployeeId: row.caspecoId } : {}),
  };
}

export async function importRatesJson(prisma: PrismaClient, json: unknown) {
  const parsed: RatesImport = parseRatesFile(json);
  const current = await prisma.labourSettings.findUnique({ where: { id: 1 } });
  const base = current
    ? {
        fohAvg: current.fohAvg,
        kitchenAvg: current.kitchenAvg,
        bakeryAvg: current.bakeryAvg,
        targetFohPct: current.targetFohPct,
        semesterPct: current.semesterPct,
        agaPct: current.agaPct,
        yearlyTargetPct: current.yearlyTargetPct,
      }
    : { ...DEFAULT_LABOUR, yearlyTargetPct: 10 };
  await prisma.labourSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      ...base,
      ...parsed.settings,
    },
    update: { ...parsed.settings },
  });
  for (const [name, rate] of Object.entries(parsed.hourly)) {
    await prisma.employee.updateMany({ where: { name }, data: { hourlyRate: rate } });
  }
  if (parsed.salary.length) {
    await prisma.employee.updateMany({ where: { name: { in: parsed.salary } }, data: { salary: true } });
  }
  return { hourly: Object.keys(parsed.hourly).length, salary: parsed.salary.length };
}

export async function importCatalogueJson(prisma: PrismaClient, json: CatalogueFile, replace = false) {
  const parsed = parseCatalogue(json);
  const ids = parsed.items.map((item) => item.n);
  for (const item of parsed.items) {
    await prisma.catalogueItem.upsert({
      where: { n: item.n },
      create: {
        n: item.n,
        category: item.category,
        name: item.name,
        supplier: item.supplier,
        sites: item.sites,
        orderUnit: item.orderUnit,
        primaryUnit: item.primaryUnit,
        primaryToBase: item.primaryToBase,
        baseUnit: item.baseUnit,
        perPiece: item.perPiece,
        priceSek: item.priceSek,
        note: item.note,
        alts: item.alts,
      },
      update: {
        category: item.category,
        name: item.name,
        supplier: item.supplier,
        sites: item.sites,
        orderUnit: item.orderUnit,
        primaryUnit: item.primaryUnit,
        primaryToBase: item.primaryToBase,
        baseUnit: item.baseUnit,
        perPiece: item.perPiece,
        priceSek: item.priceSek,
        note: item.note,
        alts: item.alts,
      },
    });
  }
  let removed = 0;
  if (replace) {
    const stale = await prisma.catalogueItem.findMany({ where: { n: { notIn: ids } }, select: { n: true } });
    for (const row of stale) {
      const used = await prisma.stockLine.count({ where: { itemN: row.n } });
      if (used) continue;
      await prisma.catalogueItem.delete({ where: { n: row.n } });
      removed += 1;
    }
  }
  for (const [category, limit] of Object.entries(parsed.rules.limits)) {
    await prisma.categoryLimit.upsert({
      where: { category },
      create: {
        category,
        kg: limit.kg ?? null,
        litres: limit.L ?? null,
        pcs: limit.pcs ?? null,
        units: limit.units ?? null,
        valueCap: limit.valueCap ?? null,
      },
      update: {
        kg: limit.kg ?? null,
        litres: limit.L ?? null,
        pcs: limit.pcs ?? null,
        units: limit.units ?? null,
        valueCap: limit.valueCap ?? null,
      },
    });
  }
  await prisma.stockSettings.upsert({
    where: { id: 1 },
    create: { id: 1, maxUnits: parsed.rules.maxUnits, valueCap: parsed.rules.valueCap },
    update: { maxUnits: parsed.rules.maxUnits, valueCap: parsed.rules.valueCap },
  });
  return { items: parsed.items.length, skipped: parsed.skipped, removed };
}

export async function ensureUser(
  prisma: PrismaClient,
  input: { email: string; name: string; password: string; role: "ADMIN" | "MANAGER"; shopCode?: string | null },
) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email,
      name: input.name,
      passwordHash: await bcrypt.hash(input.password, 10),
      role: input.role,
      shopCode: input.shopCode || null,
    },
  });
}

