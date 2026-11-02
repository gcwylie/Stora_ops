import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import path from "path";
import { addDays, asUtcDate, eachDate, mondayOf, weekdayIndex } from "../src/lib/dates";
import { DEFAULT_LABOUR } from "../src/lib/labour";
import { ensureUser, importCatalogueJson, importSalesJson } from "../src/lib/persist";
import { DEFAULT_LIMITS } from "../src/lib/stock-math";

const prisma = new PrismaClient();

const DEMO_ITEMS = [
  item(9001, "2. Dairy & cheese", "Milk 1 L", "Demo Dairy", ["SE88", "SIB2"], "L", "L", 1, "L", null, [{ u: "dl", f: 0.1 }], 12),
  item(9002, "2. Dairy & cheese", "Butter 500 g", "Demo Dairy", ["SE88", "SIB2"], "pack", "pack", 0.5, "kg", null, [{ u: "g", f: 0.002 }], 48),
  item(9003, "4. Dry goods & bakery", "Wheat flour 5 kg", "Demo Mill", ["SIB2"], "bag (1 bag = 5 kg)", "bag", 5, "kg", null, [{ u: "kg", f: 0.2 }], 85),
  item(9004, "1. Fruit & vegetables", "Lemon", "Demo Market", ["SE88", "SIB2"], "kg", "kg", 1, "kg", null, [{ u: "g", f: 0.001 }], 32),
  item(9005, "5. Finished bakery products", "Croissant", "Own bakery", ["SE88", "SIB2"], "pcs", "pcs", null, null, null, [], 18),
  item(9006, "6. Drinks & coffee", "Coffee beans", "Demo Roaster", ["SE88"], "kg", "kg", 1, "kg", null, [{ u: "g", f: 0.001 }], 220),
  item(9007, "6. Drinks & coffee", "Orange juice", "Demo Dairy", ["SE88", "SIB2"], "L", "L", 1, "L", null, [{ u: "dl", f: 0.1 }], 28),
  item(9008, "7. Alcohol", "House red 75 cl", "Demo Wine", ["SIB2"], "bottle", "bottle", 0.75, "L", null, [], 145),
  item(9009, "8. Packaging & take away", "Takeaway cup", "Demo Pack", ["SE88", "SIB2"], "pcs", "pcs", null, null, null, [{ u: "sleeve (50)", f: 50 }], 2.4),
  item(9010, "9. Cleaning & hygiene", "Hand soap", "Demo Clean", ["SE88"], "L", "L", 1, "L", null, [], 36),
  item(9011, "10. Merchandise", "Tote bag", "Demo Print", ["SIB2"], "pcs", "pcs", null, null, null, [], 180),
  item(9012, "3. Meat & fish", "Chicken thigh", "Demo Meat", ["SE88"], "kg", "kg", 1, "kg", null, [{ u: "g", f: 0.001 }], 95),
];

function item(
  n: number,
  category: string,
  name: string,
  supplier: string,
  sites: string[],
  orderUnit: string,
  primaryUnit: string,
  primaryToBase: number | null,
  baseUnit: string | null,
  perPiece: number | null,
  alts: { u: string; f: number }[],
  priceSek: number,
) {
  return { n, category, name, supplier, sites, orderUnit, primaryUnit, primaryToBase, baseUnit, perPiece, alts, priceSek, note: "Demo item." };
}

async function main() {
  await prisma.labourSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...DEFAULT_LABOUR, yearlyTargetPct: 10 },
    update: {},
  });
  await prisma.stockSettings.upsert({
    where: { id: 1 },
    create: { id: 1, maxUnits: 100, valueCap: 20000, countOverdueDays: 7 },
    update: {},
  });

  const email = process.env.ADMIN_EMAIL || "graeme@stora.local";
  const password = process.env.ADMIN_PASSWORD || "stora-demo";
  const name = process.env.ADMIN_NAME || "Graeme";
  await ensureUser(prisma, { email, name, password, role: "ADMIN" });
  console.log(`Admin login: ${email}`);

  if (process.env.SEED_DEMO === "0") {
    console.log("SEED_DEMO=0, skipped demo catalogue, staff, sales, and counts.");
    return;
  }

  await ensureUser(prisma, {
    email: "se.manager@stora.local",
    name: "St Erik manager",
    password,
    role: "MANAGER",
    shopCode: "SE88",
  });
  await ensureUser(prisma, {
    email: "sib.manager@stora.local",
    name: "Östermalm manager",
    password,
    role: "MANAGER",
    shopCode: "SIB2",
  });

  if ((await prisma.catalogueItem.count()) === 0) {
    await importCatalogueJson(prisma, {
      items: DEMO_ITEMS.map((row) => ({
        n: row.n,
        c: row.category,
        i: row.name,
        s: row.supplier,
        u: row.sites,
        p: row.orderUnit,
        pu: row.primaryUnit,
        pv: row.primaryToBase,
        pb: row.baseUnit,
        pc: row.perPiece,
        alts: row.alts,
        pr: row.priceSek,
        k: row.note,
      })),
      limits: DEFAULT_LIMITS,
      maxUnits: 100,
      valueCap: 20000,
    });
    console.log(`Demo catalogue: ${DEMO_ITEMS.length} items.`);
  }

  if ((await prisma.employee.count()) === 0) {
    const people = [
      ["Nora Lind", "Bakery", "SIB2", null, true, null, "demo-1001"],
      ["Elias Berg", "Bakery", "SIB2", null, true, null, "demo-1002"],
      ["Mira Holm", "Kitchen", "SIB2", null, false, 160, "demo-1003"],
      ["Alex Nyström", "FOH", "SIB2", null, false, null, "demo-1004"],
      ["Sam Ek", "FOH", "SIB2", "SE88", false, 165, "demo-1005"],
      ["Noa Berg", "FOH", "SIB2", null, false, null, "demo-1006"],
      ["Graeme", "Admin", "SIB2", null, true, null, "demo-1007"],
      ["Liv Holm", "FOH", "SE88", null, false, null, "demo-1008"],
      ["Eden Wahl", "FOH", "SE88", null, false, 153, "demo-1009"],
    ] as const;
    for (const [personName, groupName, home, also, salary, hourly, caspeco] of people) {
      await prisma.employee.create({
        data: {
          name: personName,
          groupName,
          homeShopCode: home,
          alsoShopCode: also,
          salary,
          hourlyRate: hourly,
          caspecoEmployeeId: caspeco,
        },
      });
    }
    console.log("Demo roster created.");
  }

  if ((await prisma.salesDay.count()) < 30) {
    const today = "2026-11-02";
    const days = eachDate("2023-01-01", today).flatMap((iso) => {
      const monthDay = iso.slice(5);
      if (monthDay === "12-24" || monthDay === "12-25" || monthDay === "01-01") return [];
      return (["SIB2", "SE88"] as const).map((shopCode) => {
        const month = Number(iso.slice(5, 7));
        const year = Number(iso.slice(0, 4));
        let kr = 15000 + month * 350;
        const weekday = weekdayIndex(iso);
        if (weekday >= 4) kr += 4000;
        if (shopCode === "SE88") kr = Math.round(kr * 0.74);
        kr = Math.round(kr * (1 + (year - 2023) * 0.05));
        return {
          date: asUtcDate(iso),
          shopCode,
          exclOre: kr * 100,
          inclOre: Math.round(kr * 1.12) * 100,
          source: "demo",
        };
      });
    });
    for (let i = 0; i < days.length; i += 500) {
      await prisma.salesDay.createMany({ data: days.slice(i, i + 500), skipDuplicates: true });
    }
    const sample = path.join(__dirname, "../fixtures/sales-days.sample.json");
    await importSalesJson(prisma, JSON.parse(readFileSync(sample, "utf8")), "import");
    await prisma.staffCostMonth.createMany({
      data: [
        { month: "2025-10", shopCode: "SIB2", costKr: 420000 },
        { month: "2025-10", shopCode: "SE88", costKr: 180000 },
        { month: "2026-10", shopCode: "SIB2", costKr: 450000 },
        { month: "2026-10", shopCode: "SE88", costKr: 190000 },
      ],
      skipDuplicates: true,
    });
    console.log(`Demo sales days: ${days.length} rows.`);
  }

  if ((await prisma.scheduleShift.count()) === 0) {
    const byName = new Map((await prisma.employee.findMany()).map((person) => [person.name, person.id]));
    const monday = mondayOf("2026-11-02");
    const place = async (shop: string, person: string, days: number[], shiftId: string, start: string, end: string) => {
      const employeeId = byName.get(person);
      if (!employeeId) return;
      for (const dayIndex of days) {
        await prisma.scheduleShift.create({
          data: { shopCode: shop, weekMonday: asUtcDate(monday), employeeId, dayIndex, shiftId, startTime: start, endTime: end },
        });
      }
    };
    await place("SIB2", "Nora Lind", [0, 1, 2, 3], "avbak", "03:00", "11:30");
    await place("SIB2", "Elias Berg", [0, 1, 4], "bakers", "05:20", "13:50");
    await place("SIB2", "Mira Holm", [0, 1, 2, 3, 4], "kit-am", "07:00", "15:30");
    await place("SIB2", "Alex Nyström", [0, 1, 2, 3], "foh-open", "07:00", "14:00");
    await place("SIB2", "Sam Ek", [0, 1, 2, 3], "pm-runner", "08:00", "17:00");
    await place("SIB2", "Noa Berg", [0, 1, 2, 3, 4], "pm-close", "11:00", "18:30");
    await place("SIB2", "Graeme", [0, 1, 2, 3, 4], "admin", "09:00", "17:00");
    await place("SIB2", "Alex Nyström", [5, 6], "foh-open", "07:00", "14:00");
    await place("SIB2", "Noa Berg", [5, 6], "foh-pm", "09:00", "18:30");
    await place("SE88", "Liv Holm", [0, 1, 2, 3, 4], "open", "06:30", "14:30");
    await place("SE88", "Eden Wahl", [0, 1, 2, 3, 4], "close", "09:00", "17:30");
    await place("SE88", "Sam Ek", [5], "mid-weekend", "08:00", "16:30");
    console.log("Demo week placed.");
  }

  if ((await prisma.stockCount.count()) === 0) {
    await demoCount("SIB2", "2026-10-25", { 9001: 10, 9002: 6, 9003: 8, 9004: 4, 9005: 40, 9007: 12, 9008: 8, 9009: 200, 9011: 6 });
    await demoCount("SIB2", "2026-11-01", { 9001: 0, 9002: 2, 9003: 5, 9004: 1, 9005: 12, 9007: 4, 9008: 6, 9009: 80, 9011: 6 });
    await demoCount("SE88", "2026-10-18", { 9001: 2, 9002: 1, 9004: 3, 9005: 20, 9006: 4, 9007: 6, 9009: 100, 9010: 2, 9012: 3 });
    console.log("Demo stock counts submitted.");
  }
  void addDays;
}

async function demoCount(shop: string, date: string, qty: Record<number, number>) {
  const count = await prisma.stockCount.create({
    data: { shopCode: shop, countDate: asUtcDate(date), countedBy: "Demo", status: "submitted", submittedAt: new Date(`${date}T12:00:00Z`) },
  });
  await prisma.stockLine.createMany({
    data: Object.entries(qty).map(([itemN, value]) => ({
      countId: count.id,
      itemN: Number(itemN),
      qty: value,
      note: "",
    })),
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
