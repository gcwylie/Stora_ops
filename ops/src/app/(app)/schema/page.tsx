import { ScheduleBoard } from "@/components/schedule-board";
import { requireUser, resolveShop, shopsForUser } from "@/lib/access";
import { addDays, lastYearSameWeekday, mondayOf, stockholmToday } from "@/lib/dates";
import { labourSettings, roster, salesMap, weekCells } from "@/lib/load";
import type { ShopCode } from "@/lib/shops";
import { headers } from "next/headers";

function originFrom(host: string | null, proto: string | null) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  return `${proto || "http"}://${host || "localhost:3000"}`;
}

export default async function SchemaPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string; week?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const shop = await resolveShop(user, params.shop);
  const monday = mondayOf(params.week && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? params.week : stockholmToday());
  const [people, cells, otherCells, sales, settings] = await Promise.all([
    roster(),
    weekCells(shop, monday),
    weekCells(shop === "SE88" ? "SIB2" : "SE88", monday),
    salesMap(),
    labourSettings(),
  ]);
  const salesByIso: Record<string, number> = {};
  const lastYearByIso: Record<string, number> = {};
  for (let day = 0; day < 7; day += 1) {
    const iso = addDays(monday, day);
    salesByIso[iso] = (sales.days[iso]?.[shop]?.excl || 0) / 100;
    lastYearByIso[iso] = (sales.days[lastYearSameWeekday(iso)]?.[shop]?.excl || 0) / 100;
  }
  const header = await headers();
  const origin = originFrom(header.get("x-forwarded-host") || header.get("host"), header.get("x-forwarded-proto"));
  const token = process.env.CASPECO_TOKEN || "";
  const bookmarklet = `javascript:void((function(){var s=document.createElement('script');s.src='${origin}/api/caspeco/bridge.js?t='+Date.now()+'${token ? `&token=${encodeURIComponent(token)}` : ""}';document.body.appendChild(s)})())`;
  return (
    <ScheduleBoard
      key={`${shop}-${monday}`}
      shop={shop as ShopCode}
      monday={monday}
      people={people}
      cells={cells}
      otherCells={otherCells}
      salesByIso={salesByIso}
      lastYearByIso={lastYearByIso}
      settings={settings}
      yearTargetPct={settings.yearlyTargetPct}
      bookmarklet={bookmarklet}
      shops={shopsForUser(user)}
    />
  );
}
