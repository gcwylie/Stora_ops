import Link from "next/link";
import { requireUser, resolveShop, shopsForUser } from "@/lib/access";
import { prisma } from "@/lib/db";
import { catalogueFor, dateIsoOf, lineFromRow } from "@/lib/load";
import { shopByCode, type ShopCode } from "@/lib/shops";
import { isLowStock, primaryUnits, suggestedOrderQty, usageBetween } from "@/lib/stock-math";

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ shop?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const shop = await resolveShop(user, params.shop);
  const items = await catalogueFor(shop as ShopCode);
  const counts = await prisma.stockCount.findMany({
    where: { shopCode: shop, status: "submitted" },
    orderBy: { countDate: "desc" },
    take: 2,
    include: { lines: true },
  });
  const latest = counts[0];
  const previous = counts[1];
  const latestLines: Record<number, ReturnType<typeof lineFromRow>> = {};
  const prevLines: Record<number, ReturnType<typeof lineFromRow>> = {};
  latest?.lines.forEach((line) => {
    latestLines[line.itemN] = lineFromRow(line);
  });
  previous?.lines.forEach((line) => {
    prevLines[line.itemN] = lineFromRow(line);
  });
  const groups = new Map<string, { name: string; unit: string; onHand: number; used: number | null; suggest: number | null; low: boolean }[]>();
  items.forEach((item) => {
    const used = previous ? usageBetween(item, prevLines[item.n], latestLines[item.n]) : null;
    const suggest = suggestedOrderQty(used);
    const low = isLowStock(item, latestLines[item.n], prevLines[item.n]);
    if (!(suggest && suggest > 0) && !low) return;
    const list = groups.get(item.supplier) || [];
    list.push({
      name: item.name,
      unit: item.primaryUnit,
      onHand: primaryUnits(item, latestLines[item.n]),
      used,
      suggest,
      low,
    });
    groups.set(item.supplier, list);
  });
  return (
    <>
      <div className="toolbar no-print">
        <div className="pills">
          {shopsForUser(user).map((row) => (
            <Link key={row.code} className={`pill ${shop === row.code ? "active" : ""}`} href={`/lager/order?shop=${row.code}`}>
              {row.name}
            </Link>
          ))}
        </div>
        <Link className="btn btn-ghost" href={`/lager?shop=${shop}`}>
          Back to Lager
        </Link>
      </div>
      <div className="card orders">
        <h2>Suggested order · {shopByCode(shop)?.name}</h2>
        {!latest ? (
          <p>Submit a count before there is an order to suggest.</p>
        ) : !previous ? (
          <p>
            One count is in, from {dateIsoOf(latest.countDate)}. A second count is what shows usage. Until then, only items counted at zero are listed.
          </p>
        ) : (
          <p className="meta">
            Usage is {dateIsoOf(previous.countDate)} minus {dateIsoOf(latest.countDate)}, in ordering units. The suggestion is that usage. There is no par level on the catalogue, so a delivery that raised the count suggests nothing.
          </p>
        )}
        {[...groups.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "sv"))
          .map(([supplier, rows]) => (
            <section key={supplier}>
              <h3>{supplier}</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th className="num">On hand</th>
                    <th className="num">Used</th>
                    <th className="num">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name}>
                      <td>
                        {row.name}
                        {row.low ? <small className="site-tag">Low</small> : null}
                      </td>
                      <td className="num">
                        {row.onHand} {row.unit}
                      </td>
                      <td className="num">{row.used == null ? "—" : row.used}</td>
                      <td className="num">
                        <b>{row.suggest && row.suggest > 0 ? `${row.suggest} ${row.unit}` : row.low ? "out" : "—"}</b>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        {!groups.size && latest ? <p className="meta">Nothing to order from these two counts.</p> : null}
      </div>
    </>
  );
}
