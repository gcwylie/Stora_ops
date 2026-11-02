import Link from "next/link";
import { RecentDays, SalesEntry, TargetControl, WageInput } from "@/components/sales-controls";
import { requireUser, resolveView, shopsForUser } from "@/lib/access";
import { formatKrOre, formatPctPoints } from "@/lib/format";
import { labourSettings, salesMap, todayIso } from "@/lib/load";
import { buildSalesSnapshot, signedPct } from "@/lib/sales-math";
import { monthName } from "@/lib/dates";
import { shopByCode, type ShopView } from "@/lib/shops";

export default async function SalesPage({ searchParams }: { searchParams: Promise<{ view?: string; vat?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const view = (await resolveView(user, params.view)) as ShopView;
  const vat = params.vat === "incl" ? "incl" : "excl";
  const [sales, settings] = await Promise.all([salesMap(), labourSettings()]);
  const today = todayIso();
  const snap = buildSalesSnapshot({
    days: sales.days,
    periods: sales.periods,
    costs: sales.costs,
    today,
    shop: view,
    vat,
    targetPct: settings.yearlyTargetPct,
  });
  const shops = shopsForUser(user);
  const recent: { iso: string; shop: string; name: string; excl: string; incl: string }[] = [];
  Object.entries(sales.days)
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .slice(0, 21)
    .forEach(([iso, row]) => {
      shops.forEach((shop) => {
        const money = row[shop.code];
        if (!money) return;
        recent.push({ iso, shop: shop.code, name: shop.name, excl: String(money.excl), incl: String(money.incl) });
      });
    });
  const query = (next: { view?: string; vat?: string }) => {
    const sp = new URLSearchParams();
    sp.set("view", next.view ?? view);
    sp.set("vat", next.vat ?? vat);
    return `/sales?${sp}`;
  };
  return (
    <>
      <div className="toolbar">
        <div className="pills">
          {user.role === "ADMIN" ? (
            <Link className={`pill ${view === "both" ? "active" : ""}`} href={query({ view: "both" })}>
              Both shops
            </Link>
          ) : null}
          {shops.map((shop) => (
            <Link key={shop.code} className={`pill ${view === shop.code ? "active" : ""}`} href={query({ view: shop.code })}>
              {shop.name}
            </Link>
          ))}
        </div>
        <div className="pills">
          <Link className={`pill ${vat === "excl" ? "active" : ""}`} href={query({ vat: "excl" })}>
            Excl. VAT
          </Link>
          <Link className={`pill ${vat === "incl" ? "active" : ""}`} href={query({ vat: "incl" })}>
            Incl. VAT
          </Link>
        </div>
        <div className="spacer" />
        <TargetControl value={settings.yearlyTargetPct} />
      </div>
      <div className="card">
        <h2>Enter a day</h2>
        <p className="sales-legend">
          Type the day’s sales for one shop. Excl. VAT feeds labour % on Schema straight away. A Caspeco sales feed can write the same days later; this form is the manual source until then.
        </p>
        <SalesEntry today={today} shops={shops} />
      </div>
      <div className="stats">
        <div className="stat">
          <b>{formatKrOre(snap.ytdOre)}</b>
          <span>
            {snap.year} to {snap.through.slice(8)} {monthName(Number(snap.through.slice(5, 7)) - 1).slice(0, 3)}, {vat === "incl" ? "incl. VAT" : "excl. VAT"}
          </span>
        </div>
        <div className="stat">
          <b data-tone={snap.ytdPct != null && snap.ytdPct >= 0 ? "up" : "down"}>{signedPct(snap.ytdPct)}</b>
          <span>{formatKrOre(snap.lastYtdOre)} last year to the same date</span>
        </div>
        <div className="stat">
          <b>{formatKrOre(snap.yearTargetOre)}</b>
          <span>Full-year target</span>
        </div>
        <div className="stat">
          <b>{formatKrOre(snap.remainingNeededOre)}</b>
          <span>Still needed</span>
        </div>
        <div className="stat">
          <b>{formatKrOre(snap.paceOre)}</b>
          <span>Per remaining day</span>
        </div>
        <div className="stat">
          <b>{formatPctPoints(snap.wageYtdPct)}</b>
          <span>Wage % on months with a cost</span>
        </div>
      </div>
      <div className="stats">
        {snap.yearStats.map((stat) => (
          <div className="stat" key={stat.label}>
            <b>{formatKrOre(stat.ore)}</b>
            <span>{stat.label}</span>
          </div>
        ))}
      </div>
      <div className="hint">
        Your numbers live in this app. Toggle excl. or incl. VAT at the top. History can be imported from sales-days.json (Baemingo, then Caspeco). Days still to come are last year × your target. St Eriksgatan is Sankt Eriksgatan 88. Östermalm is Sibyllegatan 2.
      </div>
      <p className="hint">
        {snap.lastRemainingOre > 0
          ? `Last year the remaining dates were ${formatKrOre(snap.lastRemainingOre)} for this shop view. To hit +${snap.targetPct}% on the full year you need to be ${signedPct(snap.restPct)} on the remaining days, about ${formatKrOre(snap.paceOre)} per open day.`
          : "Set a yearly target to see the remaining-day pace."}
      </p>
      <div className="sales-grid">
        <div className="sales-card">
          <h2>Each month vs last year</h2>
          {snap.months.map((month) => (
            <div className="sales-bar-row" key={month.key}>
              <span>{month.label.slice(0, 3)}</span>
              <div className="sales-bar-track">
                {month.valuesOre.map((ore, index) => (
                  <div
                    key={snap.historyYears[index]}
                    className={`sales-bar y${index}${index === 3 && month.projected ? " proj" : ""}`}
                    style={{ width: `${(Math.max(index === 3 ? month.shownOre : ore, 0) / snap.maxMonthOre) * 100}%` }}
                  />
                ))}
              </div>
            </div>
          ))}
          <p className="sales-legend">
            {snap.historyYears.map((year, index) => `${year}${index < 3 ? " · " : ""}`).join("")}. Blue is this year. Pale blue is the target projection.
          </p>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                {snap.historyYears.map((year) => (
                  <th key={year} className="num">
                    {year}
                  </th>
                ))}
                <th className="num">vs {snap.prior}</th>
              </tr>
            </thead>
            <tbody>
              {snap.months.map((month) => (
                <tr key={month.key} className={month.projected ? "proj" : ""}>
                  <td>{month.label}</td>
                  {month.valuesOre.slice(0, 3).map((ore, index) => (
                    <td key={snap.historyYears[index]} className="num">
                      {formatKrOre(ore)}
                    </td>
                  ))}
                  <td className="num">{month.projected ? `${formatKrOre(month.shownOre)} proj.` : formatKrOre(month.valuesOre[3])}</td>
                  <td className="num">{signedPct(month.vsPriorPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="sales-card sales-days">
          <h2>Remaining days</h2>
          <p className="sales-legend">Same calendar date each year. The weekday under each figure is that year’s actual day.</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th></th>
                {snap.historyYears.slice(0, 3).map((year) => (
                  <th key={year} className="num">
                    {year}
                  </th>
                ))}
                <th className="num">If +{snap.targetPct}%</th>
                <th className="num">Pace</th>
              </tr>
            </thead>
            <tbody>
              {snap.remaining.map((day) => (
                <tr key={day.iso}>
                  <td>{day.label}</td>
                  <td>{day.weekday}</td>
                  {day.history.map((hist) => (
                    <td key={hist.iso} className="num">
                      {hist.ore ? formatKrOre(hist.ore) : "Closed"}
                      <span className="meta" style={{ display: "block" }}>
                        {hist.iso}
                      </span>
                    </td>
                  ))}
                  <td className="num">{day.closed ? "Closed" : formatKrOre(day.targetOre)}</td>
                  <td className="num">{day.closed ? "—" : formatKrOre(snap.paceOre)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="sales-card" style={{ marginTop: 16 }}>
        <h2>Recent days</h2>
        <RecentDays rows={recent.slice(0, 30)} />
      </div>
      <div className="sales-card" style={{ marginTop: 16 }}>
        <h2>Wage %</h2>
        <p className="sales-legend">Month actuals from the books ÷ sales excl. VAT. The week labour sheet on Schema is FOH + kitchen, bakery on its own.</p>
        <div className="stats">
          <div className="stat">
            <b>{formatPctPoints(snap.wageYtdPct)}</b>
            <span>{snap.year} wage % on months with a cost</span>
          </div>
          <div className="stat">
            <b>{formatPctPoints(snap.wagePriorPct)}</b>
            <span>
              {snap.prior} through {monthName(Number(snap.through.slice(5, 7)) - 1)} on months with a cost
            </span>
          </div>
          <div className="stat">
            <b>{snap.wageLastMonth ? formatPctPoints(snap.wageLastMonth.pct) : "—"}</b>
            <span>{snap.wageLastMonth ? `Last filled month · ${monthName(Number(snap.wageLastMonth.key.slice(5)) - 1)}` : "Last filled month"}</span>
          </div>
          <div className="stat">
            <b>{snap.wageYtdCostKr ? formatKrOre(snap.wageYtdCostKr * 100) : "—"}</b>
            <span>{snap.year} staff cost entered</span>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Month</th>
              <th className="num">{snap.prior} sales</th>
              <th className="num">{snap.prior} cost</th>
              <th className="num">{snap.prior} %</th>
              <th className="num">{snap.year} sales</th>
              <th className="num">{snap.year} cost</th>
              <th className="num">{snap.year} %</th>
            </tr>
          </thead>
          <tbody>
            {snap.wageMonths.map((month) => (
              <tr key={month.thisKey}>
                <td>{month.label}</td>
                <td className="num">{month.priorSalesOre ? formatKrOre(month.priorSalesOre) : "—"}</td>
                <td className="num">
                  <WageInput month={month.priorKey} shop={view} value={month.priorCostKr} />
                </td>
                <td className="num">{formatPctPoints(month.priorPct)}</td>
                <td className="num">{month.thisSalesOre ? formatKrOre(month.thisSalesOre) : "—"}</td>
                <td className="num">
                  <WageInput month={month.thisKey} shop={view} value={month.thisCostKr} />
                </td>
                <td className="num">{formatPctPoints(month.thisPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="meta">Showing {view === "both" ? "both shops" : shopByCode(view)?.name}.</p>
    </>
  );
}
