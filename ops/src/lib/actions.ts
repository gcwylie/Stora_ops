"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertShop, requireUser } from "./access";
import { addDays, asUtcDate, isoWeekNumber } from "./dates";
import { prisma } from "./db";
import { parseKr, setStaffCost } from "./sales-math";
import { clearSessionCookie, setSessionCookie, signSession } from "./session";
import { CASPECO_STATIONS, effectiveGroup, shiftById, shiftName, stockholmToUtcIso } from "./shifts";
import { isShopCode, isStaffGroup, shopByCode, type ShopCode } from "./shops";

export async function login(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "That email or password is not right." };
  }
  const token = await signSession({
    uid: user.id,
    email: user.email,
    name: user.name,
    role: user.role === "ADMIN" ? "ADMIN" : "MANAGER",
    shopCode: user.shopCode || "",
  });
  await setSessionCookie(token);
  redirect("/");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}

export async function saveShift(input: {
  shop: string;
  monday: string;
  employeeId: string;
  dayIndex: number;
  shiftId: string;
  start: string;
  end: string;
}) {
  const user = await requireUser();
  const shop = assertShop(user, input.shop);
  const employee = await prisma.employee.findUnique({ where: { id: input.employeeId } });
  if (!employee || !employee.active) throw new Error("That person is not on the roster.");
  const weekMonday = asUtcDate(input.monday);
  const where = {
    shopCode_weekMonday_employeeId_dayIndex: {
      shopCode: shop,
      weekMonday,
      employeeId: employee.id,
      dayIndex: input.dayIndex,
    },
  };
  if (!input.shiftId || input.shiftId === "off") {
    await prisma.scheduleShift.deleteMany({
      where: { shopCode: shop, weekMonday, employeeId: employee.id, dayIndex: input.dayIndex },
    });
  } else {
    const template = shiftById(shop, effectiveGroup(shop, employee.groupName), input.shiftId);
    const start = input.start || template?.start || "";
    const end = input.end || template?.end || "";
    await prisma.scheduleShift.upsert({
      where,
      create: {
        shopCode: shop,
        weekMonday,
        employeeId: employee.id,
        dayIndex: input.dayIndex,
        shiftId: input.shiftId,
        startTime: start,
        endTime: end,
      },
      update: { shiftId: input.shiftId, startTime: start, endTime: end },
    });
  }
  revalidatePath("/schema");
  revalidatePath("/");
}

export async function saveHourlyRate(employeeId: string, raw: string) {
  const user = await requireUser();
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee) throw new Error("Unknown person.");
  const onShop = employee.homeShopCode === user.shopCode || employee.alsoShopCode === user.shopCode;
  if (user.role !== "ADMIN" && !onShop) throw new Error("That person is not on your shop.");
  const cleaned = raw.trim().replace(",", ".");
  const hourlyRate = !cleaned ? null : Number(cleaned);
  if (hourlyRate != null && (!Number.isFinite(hourlyRate) || hourlyRate <= 0)) {
    throw new Error("Enter a kr/h figure, or leave it blank to use the department rate.");
  }
  await prisma.employee.update({
    where: { id: employeeId },
    data: { hourlyRate: hourlyRate == null ? null : Math.round(hourlyRate) },
  });
  revalidatePath("/schema");
  revalidatePath("/staff");
}

export async function saveLabourSettings(input: {
  fohAvg?: number;
  kitchenAvg?: number;
  bakeryAvg?: number;
  targetFohPct?: number;
  yearlyTargetPct?: number;
}) {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "MANAGER") throw new Error("Not allowed.");
  await prisma.labourSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...input },
    update: input,
  });
  revalidatePath("/schema");
  revalidatePath("/sales");
  revalidatePath("/");
}

export async function clearWeek(shop: string, monday: string) {
  const user = await requireUser();
  const shopCode = assertShop(user, shop);
  await prisma.scheduleShift.deleteMany({ where: { shopCode, weekMonday: asUtcDate(monday) } });
  revalidatePath("/schema");
  revalidatePath("/");
}

export async function queueCaspeco(shop: string, monday: string) {
  const user = await requireUser();
  const shopCode = assertShop(user, shop);
  const weekMonday = asUtcDate(monday);
  const shifts = await prisma.scheduleShift.findMany({
    where: { shopCode, weekMonday },
    include: { employee: true },
  });
  const unmatched = new Set<string>();
  const payloadShifts = [];
  for (const shift of shifts) {
    const employee = shift.employee;
    if (!employee.caspecoEmployeeId) {
      unmatched.add(employee.name);
      continue;
    }
    const group = effectiveGroup(shopCode, employee.groupName);
    const stationId = CASPECO_STATIONS[shopCode][group];
    if (!stationId) continue;
    const date = addDays(monday, shift.dayIndex);
    const shopName = shopByCode(shopCode)?.short || shopCode;
    const template = shiftById(shopCode, group, shift.shiftId);
    const passName = template ? shiftName(template.label) : shift.shiftId;
    payloadShifts.push({
      name: employee.name,
      employeeId: employee.caspecoEmployeeId,
      employmentId: employee.caspecoEmployeeId,
      stationId,
      date,
      inTime: stockholmToUtcIso(date, shift.startTime),
      outTime: stockholmToUtcIso(date, shift.endTime),
      comment: passName ? `${shopName} · ${passName}` : shopName,
    });
  }
  const payload = {
    site: shopCode,
    week: isoWeekNumber(monday),
    monday,
    unmatched: [...unmatched],
    shifts: payloadShifts,
  };
  await prisma.caspecoQueue.create({ data: { payload } });
  return payload;
}

export async function saveSalesDay(formData: FormData) {
  const user = await requireUser();
  const shop = assertShop(user, String(formData.get("shop") || ""));
  const date = String(formData.get("date") || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pick a date.");
  const excl = parseKr(String(formData.get("excl") || ""));
  const incl = parseKr(String(formData.get("incl") || ""));
  if (!excl && !incl) {
    await prisma.salesDay.deleteMany({ where: { date: asUtcDate(date), shopCode: shop } });
  } else {
    await prisma.salesDay.upsert({
      where: { date_shopCode: { date: asUtcDate(date), shopCode: shop } },
      create: { date: asUtcDate(date), shopCode: shop, exclOre: excl * 100, inclOre: incl * 100, source: "manual" },
      update: { exclOre: excl * 100, inclOre: incl * 100, source: "manual" },
    });
  }
  revalidatePath("/sales");
  revalidatePath("/schema");
  revalidatePath("/");
}

export async function saveStaffCost(month: string, shop: string, raw: string) {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}$/.test(month)) throw new Error("Bad month.");
  const kr = parseKr(raw);
  if (shop === "both") {
    if (user.role !== "ADMIN") throw new Error("Only Graeme can enter a combined cost.");
    const existing = await prisma.staffCostMonth.findMany({ where: { month } });
    const map: Record<string, Partial<Record<ShopCode | "BOTH", number>>> = {};
    existing.forEach((row) => {
      map[row.month] = { ...(map[row.month] || {}), [row.shopCode]: row.costKr };
    });
    const next = setStaffCost(map, month, "both", kr);
    await prisma.staffCostMonth.deleteMany({ where: { month } });
    const row = next[month];
    if (row?.BOTH) {
      await prisma.staffCostMonth.create({ data: { month, shopCode: "BOTH", costKr: row.BOTH } });
    }
  } else {
    const shopCode = assertShop(user, shop);
    if (!kr) await prisma.staffCostMonth.deleteMany({ where: { month, shopCode } });
    else {
      await prisma.staffCostMonth.upsert({
        where: { month_shopCode: { month, shopCode } },
        create: { month, shopCode, costKr: kr },
        update: { costKr: kr },
      });
      await prisma.staffCostMonth.deleteMany({ where: { month, shopCode: "BOTH" } });
    }
  }
  revalidatePath("/sales");
  revalidatePath("/");
}

export async function saveTarget(pct: number) {
  const user = await requireUser();
  if (!Number.isFinite(pct)) return;
  await prisma.labourSettings.upsert({
    where: { id: 1 },
    create: { id: 1, yearlyTargetPct: pct },
    update: { yearlyTargetPct: pct },
  });
  revalidatePath("/sales");
  revalidatePath("/schema");
  revalidatePath("/");
  void user;
}

function parseQty(raw: unknown): number | null {
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 1000) / 1000;
}

async function countForUser(user: Awaited<ReturnType<typeof requireUser>>, countId: string) {
  const count = await prisma.stockCount.findUnique({ where: { id: countId } });
  if (!count) throw new Error("That count is not here.");
  assertShop(user, count.shopCode);
  return count;
}

export async function startCount(formData: FormData) {
  const user = await requireUser();
  const shop = assertShop(user, String(formData.get("shop") || ""));
  const date = String(formData.get("date") || "").slice(0, 10);
  const countedBy = String(formData.get("countedBy") || user.name).trim() || user.name;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Pick a date.");
  const count = await prisma.stockCount.create({
    data: { shopCode: shop, countDate: asUtcDate(date), countedBy, status: "draft" },
  });
  redirect(`/lager/${count.id}`);
}

export async function saveCountLine(input: {
  countId: string;
  itemN: number;
  qty: number | string | null;
  altQty: number | string | null;
  altUnit: string | null;
  note?: string;
}) {
  const user = await requireUser();
  const count = await countForUser(user, input.countId);
  if (count.status === "submitted" && user.role !== "ADMIN") {
    throw new Error("This count is submitted. Ask Graeme to reopen it.");
  }
  const item = await prisma.catalogueItem.findUnique({ where: { n: input.itemN } });
  if (!item || !item.sites.includes(count.shopCode)) throw new Error("That item is not on this shop's list.");
  const qty = parseQty(input.qty);
  const altQty = parseQty(input.altQty);
  const note = (input.note || "").trim();
  if (qty == null && altQty == null && !note) {
    await prisma.stockLine.deleteMany({ where: { countId: count.id, itemN: item.n } });
    return;
  }
  await prisma.stockLine.upsert({
    where: { countId_itemN: { countId: count.id, itemN: item.n } },
    create: { countId: count.id, itemN: item.n, qty, altQty, altUnit: input.altUnit, note },
    update: { qty, altQty, altUnit: input.altUnit, note },
  });
}

export async function ackCountLine(countId: string, itemN: number, ack: boolean) {
  const user = await requireUser();
  const count = await countForUser(user, countId);
  await prisma.stockLine.updateMany({ where: { countId: count.id, itemN }, data: { ack } });
  revalidatePath(`/lager/${countId}/review`);
}

export async function submitCount(countId: string) {
  const user = await requireUser();
  const count = await countForUser(user, countId);
  await prisma.stockCount.update({
    where: { id: count.id },
    data: { status: "submitted", submittedAt: new Date() },
  });
  revalidatePath("/lager");
  revalidatePath("/");
  revalidatePath(`/lager/${countId}/review`);
}

export async function reopenCount(countId: string) {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only Graeme can reopen a submitted count.");
  const count = await countForUser(user, countId);
  await prisma.stockCount.update({ where: { id: count.id }, data: { status: "draft" } });
  revalidatePath("/lager");
  revalidatePath(`/lager/${countId}`);
}

export async function deleteDraft(countId: string) {
  const user = await requireUser();
  const count = await countForUser(user, countId);
  if (count.status !== "draft") throw new Error("Submitted counts stay in the history.");
  await prisma.stockCount.delete({ where: { id: count.id } });
  redirect("/lager");
}

export async function saveEmployee(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new Error("Only Graeme can edit the roster.");
  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const groupName = String(formData.get("group") || "");
  const homeShopCode = String(formData.get("homeShop") || "");
  const also = String(formData.get("alsoShop") || "");
  const salary = formData.get("salary") === "on" || formData.get("salary") === "true";
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  const caspecoEmployeeId = String(formData.get("caspecoEmployeeId") || "").trim() || null;
  const hourlyRaw = String(formData.get("hourlyRate") || "").trim().replace(",", ".");
  const hourlyRate = hourlyRaw ? Number(hourlyRaw) : null;
  if (!name) throw new Error("Name is required.");
  if (!isStaffGroup(groupName)) throw new Error("Pick Bakery, Kitchen, FOH, or Admin.");
  if (!isShopCode(homeShopCode)) throw new Error("Pick a home shop.");
  const alsoShopCode = also && isShopCode(also) && also !== homeShopCode ? also : null;
  const data = {
    name,
    groupName,
    homeShopCode,
    alsoShopCode,
    salary,
    active,
    caspecoEmployeeId,
    hourlyRate: hourlyRate && hourlyRate > 0 ? Math.round(hourlyRate) : null,
  };
  if (id) await prisma.employee.update({ where: { id }, data });
  else await prisma.employee.create({ data });
  revalidatePath("/staff");
  revalidatePath("/schema");
}

export async function importWeekJson(shop: string, monday: string, raw: string) {
  const user = await requireUser();
  const shopCode = assertShop(user, shop);
  const parsed = JSON.parse(raw) as { shifts?: { name?: string; day?: number; shiftId?: string; start?: string; end?: string }[] };
  const people = await prisma.employee.findMany();
  const byName = new Map(people.map((person) => [person.name, person]));
  let placed = 0;
  const missing: string[] = [];
  for (const shift of parsed.shifts || []) {
    if (!shift.name || shift.shiftId === "off" || shift.day == null) continue;
    const employee = byName.get(shift.name);
    if (!employee) {
      if (!missing.includes(shift.name)) missing.push(shift.name);
      continue;
    }
    const template = shiftById(shopCode, effectiveGroup(shopCode, employee.groupName), shift.shiftId || "");
    await prisma.scheduleShift.upsert({
      where: {
        shopCode_weekMonday_employeeId_dayIndex: {
          shopCode,
          weekMonday: asUtcDate(monday),
          employeeId: employee.id,
          dayIndex: shift.day,
        },
      },
      create: {
        shopCode,
        weekMonday: asUtcDate(monday),
        employeeId: employee.id,
        dayIndex: shift.day,
        shiftId: shift.shiftId || template?.id || "off",
        startTime: shift.start || template?.start || "",
        endTime: shift.end || template?.end || "",
      },
      update: {
        shiftId: shift.shiftId || template?.id || "off",
        startTime: shift.start || template?.start || "",
        endTime: shift.end || template?.end || "",
      },
    });
    placed += 1;
  }
  revalidatePath("/schema");
  return { placed, missing };
}
