import Link from "next/link";
import { requireUser, resolveShop, shopsForUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { formatSek } from "@/lib/format";
import { catalogueFor, dateIsoOf, lineFromRow, overdueDays, todayIso } from "@/lib/load";
import { countTotals } from "@/lib/stock-math";
import { startCount } from "@/lib/actions";
import { shopByCode } from "@/lib/shops";

export default async function LagerPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const shop = await resolveShop(user, params.shop);
  const today = todayIso();
  const [counts, items, limitDays] = await Promise.all([
    prisma.stockCount.findMany({ where: { shopCode: shop }, orderBy: { countDate: "desc" }, include: { lines: true } }),
    catalogueFor(shop),
    overdueDays(),
  ]);
  const submitted = counts.filter((count) => count.status === "submitted");
  const latest = submitted[0];
  const age = latest ? Math.round((Date.parse(today) - latest.countDate.getTime()) / 86400000) : null;
  const demo = items.length > 0 && items.every((item) => item.n >= 9000);
  const values = submitted.map((count) => {
    const lines: Record<number, ReturnType<typeof lineFromRow>> = {};
    count.lines.forEach((line) => {
      lines[line.itemN] = lineFromRow(line);
    });
    return { id: count.id, date: dateIsoOf(count.countDate), value: countTotals(items, lines).sum };
  });
  const max = Math.max(...values.map((row) => row.value), 1);
  return (
    <>
      <div className="toolbar">
        <div className="pills">
          {shopsForUser(user).map((row) => (
            <Link key={row.code} className={`pill ${shop === row.code ? "active" : ""}`} href={`/lager?shop=${row.code}`}>
              {row.name}
            </Link>
          ))}
        </div>
        <Link className="btn btn-ghost" href={`/lager/order?shop=${shop}`}>
          Suggested order
        </Link>
      </div>
      {demo ? (
        <div className="hint">This is the small demo catalogue. Import the real list with npm run import:catalogue -- path --replace when you are ready. Gast Café is not included.</div>
      ) : null}
      {age == null || age > limitDays ? (
        <div className="alert alert-bad">
          {shopByCode(shop)?.name}: {age == null ? "no count has been submitted." : `last submitted count was ${age} days ago.`} Counts are treated as overdue after {limitDays} days.
        </div>
      ) : (
        <div className="alert alert-good">
          Last submitted count {dateIsoOf(latest.countDate)} · {formatSek(values[0]?.value || 0)}
        </div>
      )}
      <div className="card">
        <h2>New count · {shopByCode(shop)?.name}</h2>
        <form action={startCount} className="field-row">
          <input type="hidden" name="shop" value={shop} />
          <label className="field">
            Date
            <input type="date" name="date" defaultValue={today} required />
          </label>
          <label className="field">
            Counted by
            <input name="countedBy" defaultValue={user.name} required />
          </label>
          <button className="btn btn-navy" type="submit">
            Start count
          </button>
        </form>
      </div>
      <div className="card">
        <h2>Stock value</h2>
        {values.length ? (
          values
            .slice()
            .reverse()
            .map((row) => (
              <div key={row.id} className="sales-bar-row">
                <span>{row.date.slice(5)}</span>
                <div>
                  <div className="bar-line" style={{ width: `${(row.value / max) * 100}%` }} />
                  <span className="meta">{formatSek(row.value)}</span>
                </div>
              </div>
            ))
        ) : (
          <p className="meta">Value over time appears after the first submitted count.</p>
        )}
      </div>
      <div className="card">
        <h2>Counts</h2>
        {counts.map((count) => (
          <div className="row" key={count.id}>
            <span>
              {dateIsoOf(count.countDate)} · {count.countedBy}
              <small>{count.status === "submitted" ? "Submitted" : "Draft"}</small>
            </span>
            <Link href={count.status === "draft" ? `/lager/${count.id}` : `/lager/${count.id}/review`}>
              {count.status === "draft" ? "Resume" : "Review"}
            </Link>
          </div>
        ))}
        {!counts.length ? <p className="meta">No counts yet for this shop.</p> : null}
      </div>
    </>
  );
}
