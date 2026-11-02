import Link from "next/link";
import { notFound } from "next/navigation";
import { ackCountLine, deleteDraft, reopenCount, submitCount } from "../../../../../lib/actions";
import { assertShop, requireUser } from "../../../../../lib/access";
import { prisma } from "../../../../../lib/db";
import { describeLine, stockTsv } from "../../../../../lib/excel";
import { formatSek, formatSek2 } from "../../../../../lib/format";
import { catalogueFor, dateIsoOf, lineFromRow, stockRules } from "../../../../../lib/load";
import { shopByCode, type ShopCode } from "../../../../../lib/shops";
import { countTotals, counted, tooMuch, tooMuchText, valueOf } from "../../../../../lib/stock-math";

export default async function ReviewPage({ params }: { params: Promise<{ countId: string }> }) {
  const user = await requireUser();
  const { countId } = await params;
  const count = await prisma.stockCount.findUnique({ where: { id: countId }, include: { lines: true } });
  if (!count) notFound();
  assertShop(user, count.shopCode);
  const items = await catalogueFor(count.shopCode as ShopCode);
  const rules = await stockRules();
  const lines: Record<number, ReturnType<typeof lineFromRow>> = {};
  count.lines.forEach((line) => {
    lines[line.itemN] = lineFromRow(line);
  });
  const totals = countTotals(items, lines);
  const missing = totals.total - totals.done;
  const flags = items.filter((item) => tooMuch(item, lines[item.n], rules));
  const tsv = stockTsv({
    shopCode: count.shopCode,
    date: dateIsoOf(count.countDate),
    countedBy: count.countedBy,
    items,
    lines,
  });
  const categories = [...new Set(items.map((item) => item.category))];
  return (
    <>
      <div className="toolbar">
        <Link className="btn btn-ghost" href={`/lager/${count.id}`}>
          Back to counting
        </Link>
        <a className="btn btn-navy" href={`/api/stock/${count.id}/xlsx`}>
          Excel
        </a>
      </div>
      <div className="card">
        <div className="big">{formatSek(totals.sum)}</div>
        <div className="meta">
          {shopByCode(count.shopCode)?.name} · {dateIsoOf(count.countDate)} · {count.countedBy} · {totals.done} of {totals.total} items counted
          {count.status === "submitted" ? " · submitted" : " · draft"}
        </div>
      </div>
      <div className={missing ? "alert alert-bad" : "alert alert-good"}>
        {missing ? `${missing} items not counted. Anything you have none of still needs a 0, otherwise it looks forgotten.` : `All ${totals.total} items counted.`}
      </div>
      {flags.length ? (
        <div className="card">
          <h2>Does this look right?</h2>
          <p className="meta">On these lines the amount looks higher than one site would normally hold. Usually a slip of the thumb — but it could be right.</p>
          {flags.map((item) => {
            const line = lines[item.n];
            return (
              <div className="checkrow" key={item.n}>
                <div>
                  <b>{item.name}</b>
                  <small>{describeLine(item, line)}</small>
                  <small>{tooMuchText(item, line, rules)}</small>
                  {line.ack ? <small>Checked</small> : null}
                  <form
                    action={async () => {
                      "use server";
                      await ackCountLine(count.id, item.n, !line.ack);
                    }}
                  >
                    <button className="btn btn-ghost" type="submit">
                      {line.ack ? "Uncheck" : "Looks right"}
                    </button>
                  </form>
                </div>
                <b>{formatSek(valueOf(item, line))}</b>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="card">
        <h2>Value by category</h2>
        {categories.map((category) =>
          totals.catTotal[category] ? (
            <div className="row" key={category}>
              <span>
                {category.replace(/^\d+\.\s*/, "")}
                <small>
                  {totals.catDone[category] || 0} of {totals.catTotal[category]} items
                </small>
              </span>
              <span>{formatSek(totals.byCat[category] || 0)}</span>
            </div>
          ) : null,
        )}
        <div className="row">
          <b>Total</b>
          <b>{formatSek(totals.sum)}</b>
        </div>
      </div>
      <div className="card">
        <h2>What you counted</h2>
        {items.map((item) => {
          const line = lines[item.n];
          if (!counted(line)) return null;
          return (
            <div className="row" key={item.n}>
              <span>
                {item.name}
                <small>
                  {describeLine(item, line)}
                  {line.note ? ` “${line.note}”` : ""}
                </small>
              </span>
              <span>{formatSek2(valueOf(item, line))}</span>
            </div>
          );
        })}
      </div>
      <div className="card">
        <h2>Send it in</h2>
        <p className="meta">The file is stored with this count. Download the Excel workbook, or copy the table. Submitting is what the dashboard and the order list use.</p>
        <textarea readOnly value={tsv} style={{ width: "100%", minHeight: 80 }} />
        {count.status === "draft" ? (
          <form
            action={async () => {
              "use server";
              await submitCount(count.id);
            }}
          >
            <button className="btn btn-navy" type="submit">
              Submit this count
            </button>
          </form>
        ) : user.role === "ADMIN" ? (
          <form
            action={async () => {
              "use server";
              await reopenCount(count.id);
            }}
          >
            <button className="btn btn-ghost" type="submit">
              Reopen
            </button>
          </form>
        ) : null}
        {count.status === "draft" ? (
          <form
            action={async () => {
              "use server";
              await deleteDraft(count.id);
            }}
          >
            <button className="btn btn-ghost" type="submit">
              Delete this draft
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}
