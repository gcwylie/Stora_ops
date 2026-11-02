import Link from "next/link";
import { requireUser, resolveView, shopsForUser } from "@/lib/access";
import { addDays, mondayOf, monthName } from "@/lib/dates";
import { formatKr, formatKrOre, formatPctRatio } from "@/lib/format";
import {
  catalogueFor,
  labourForRange,
  labourSettings,
  lineFromRow,
  overdueDays,
  roster,
  salesMap,
  shiftsInRange,
  todayIso,
} from "@/lib/load";
import { buildSalesSnapshot, signedPct } from "@/lib/sales-math";
import { isLowStock, type LineCount } from "@/lib/stock-math";
import { prisma } from "@/lib/db";
import { shopByCode, type ShopCode, type ShopView } from "@/lib/shops";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const view = (await resolveView(user, params.view)) as ShopView;
  const shops = view === "both" ? (["SE88", "SIB2"] as ShopCode[]) : [view];
  const today = todayIso();
  const monday = mondayOf(today);
  const monthStart = `${today.slice(0, 7)}-01`;
  const monthTo = today;
  const [people, sales, settings, limitDays] = await Promise.all([roster(), salesMap(), labourSettings(), overdueDays()]);
  const weekFrom = mondayOf(monthStart);
  const parts = await Promise.all(
    shops.map(async (shop) => {
      const cells = await shiftsInRange(shop, weekFrom, mondayOf(monthTo), people);
      const week = labourForRange({
        shop,
        from: monday,
        to: addDays(monday, 6),
        cells,
        days: sales.days,
        settings,
        yearTargetPct: settings.yearlyTargetPct,
      });
      const month = labourForRange({
        shop,
        from: monthStart,
        to: monthTo,
        cells,
        days: sales.days,
        settings,
        yearTargetPct: settings.yearlyTargetPct,
      });
      return { shop, week, month };
    }),
  );
  const weekCost = parts.reduce((sum, part) => sum + part.week.totals.shopCost, 0);
  const weekSales = parts.reduce((sum, part) => sum + part.week.totals.used, 0);
  const monthCost = parts.reduce((sum, part) => sum + part.month.totals.shopCost, 0);
  const monthSales = parts.reduce((sum, part) => sum + part.month.totals.used, 0);
  const snap = buildSalesSnapshot({
    days: sales.days,
    periods: sales.periods,
    costs: sales.costs,
    today,
    shop: view,
    vat: "excl",
    targetPct: settings.yearlyTargetPct,
  });
  const alerts = await stockAlerts(shops, limitDays, today);
  const pills = (
    <div className="pills">
      {user.role === "ADMIN" ? (
        <Link className={`pill ${view === "both" ? "active" : ""}`} href="/?view=both">
          Both shops
        </Link>
      ) : null}
      {shopsForUser(user).map((shop) => (
        <Link key={shop.code} className={`pill ${view === shop.code ? "active" : ""}`} href={`/?view=${shop.code}`}>
          {shop.name}
        </Link>
      ))}
    </div>
  );
  return (
    <>
      <div className="toolbar">{pills}</div>
      <div className="stats">
        <div className="stat">
          <b>{formatPctRatio(weekSales ? weekCost / weekSales : null)}</b>
          <span>Labour % this week · FOH + kitchen</span>
        </div>
        <div className="stat">
          <b>{weekCost ? formatKr(weekCost) : "—"}</b>
          <span>Week staff cost on the schema</span>
        </div>
        <div className="stat">
          <b>{formatPctRatio(monthSales ? monthCost / monthSales : null)}</b>
          <span>Labour % {monthName(Number(today.slice(5, 7)) - 1)}</span>
        </div>
        <div className="stat">
          <b data-tone={snap.ytdPct != null && snap.ytdPct >= 0 ? "up" : "down"}>{signedPct(snap.ytdPct)}</b>
          <span>Sales vs last year, excl. VAT</span>
        </div>
        <div className="stat">
          <b>{formatKrOre(snap.ytdOre)}</b>
          <span>
            {snap.year} to {snap.through.slice(8)}/{snap.through.slice(5, 7)}
          </span>
        </div>
        <div className="stat">
          <b>{formatKrOre(snap.yearTargetOre)}</b>
          <span>Full-year target +{settings.yearlyTargetPct}%</span>
        </div>
      </div>
      <div className="hint">
        Labour % uses the week on Schema: FOH + kitchen, with 12% holiday pay and 31.42% employer socials, divided by sales excl. VAT. Where this year is still empty, the sheet uses the same weekday last year, same as the planner.{" "}
        <Link href="/schema">Open the schema</Link>
        {" · "}
        <Link href="/sales">Enter today’s sales</Link>
      </div>
      {alerts.length ? (
        alerts.map((alert) => (
          <div key={alert.href + alert.text} className={alert.tone === "bad" ? "alert alert-bad" : "alert alert-good"}>
            <Link href={alert.href}>{alert.text}</Link>
          </div>
        ))
      ) : (
        <div className="alert alert-good">No low-stock or overdue counts on this view.</div>
      )}
      <div className="card">
        <h2>This month vs last year</h2>
        <p className="meta">
          {monthName(Number(today.slice(5, 7)) - 1)} sales excl. VAT {formatKrOre(shopMonth(sales.days, today, view))} · last year{" "}
          {formatKrOre(shopMonth(sales.days, `${Number(today.slice(0, 4)) - 1}${today.slice(4, 7)}`, view, true))} · target{" "}
          {formatKrOre(shopMonth(sales.days, `${Number(today.slice(0, 4)) - 1}${today.slice(4, 7)}`, view, true) * (1 + settings.yearlyTargetPct / 100))}
        </p>
      </div>
    </>
  );
}

function shopMonth(days: Awaited<ReturnType<typeof salesMap>>["days"], prefix: string, view: ShopView, full = false) {
  let sum = 0;
  Object.entries(days).forEach(([iso, row]) => {
    if (!iso.startsWith(prefix.slice(0, 7))) return;
    if (!full && iso > prefix) return;
    const add = (code: ShopCode) => {
      sum += row[code]?.excl || 0;
    };
    if (view === "both") {
      add("SE88");
      add("SIB2");
    } else add(view);
  });
  return sum;
}

async function stockAlerts(shops: ShopCode[], limitDays: number, today: string) {
  const alerts: { href: string; text: string; tone: "bad" | "good" }[] = [];
  for (const shop of shops) {
    const name = shopByCode(shop)?.name || shop;
    const latest = await prisma.stockCount.findFirst({
      where: { shopCode: shop, status: "submitted" },
      orderBy: { countDate: "desc" },
      include: { lines: true },
    });
    if (!latest) {
      alerts.push({ href: "/lager", text: `${name}: no stock count submitted yet.`, tone: "bad" });
      continue;
    }
    const age = Math.round((Date.parse(today) - latest.countDate.getTime()) / 86400000);
    if (age > limitDays) {
      alerts.push({ href: "/lager", text: `${name}: last count was ${age} days ago. Counts are due every ${limitDays} days.`, tone: "bad" });
    }
    const previous = await prisma.stockCount.findFirst({
      where: { shopCode: shop, status: "submitted", countDate: { lt: latest.countDate } },
      orderBy: { countDate: "desc" },
      include: { lines: true },
    });
    const items = await catalogueFor(shop);
    const latestLines: Record<number, LineCount> = {};
    latest.lines.forEach((line) => {
      latestLines[line.itemN] = lineFromRow(line);
    });
    const prevLines: Record<number, LineCount> = {};
    previous?.lines.forEach((line) => {
      prevLines[line.itemN] = lineFromRow(line);
    });
    const low = items.filter((item) => isLowStock(item, latestLines[item.n], prevLines[item.n])).slice(0, 8);
    low.forEach((item) => {
      alerts.push({
        href: `/lager/order?shop=${shop}`,
        text: `${name}: ${item.name} is low (${item.supplier}).`,
        tone: "bad",
      });
    });
  }
  return alerts;
}
