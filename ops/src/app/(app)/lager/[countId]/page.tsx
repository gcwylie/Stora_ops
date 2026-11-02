import Link from "next/link";
import { notFound } from "next/navigation";
import { CountBoard } from "../../../../components/count-board";
import { assertShop, requireUser } from "../../../../lib/access";
import { prisma } from "../../../../lib/db";
import { catalogueFor, dateIsoOf, lineFromRow, stockRules } from "../../../../lib/load";
import { shopByCode, type ShopCode } from "../../../../lib/shops";

export default async function CountPage({ params }: { params: Promise<{ countId: string }> }) {
  const user = await requireUser();
  const { countId } = await params;
  const count = await prisma.stockCount.findUnique({ where: { id: countId }, include: { lines: true } });
  if (!count) notFound();
  assertShop(user, count.shopCode);
  const items = await catalogueFor(count.shopCode as ShopCode);
  const rules = await stockRules();
  const initial: Record<number, { q: number | null; a: number | null; u: string | null; note: string }> = {};
  count.lines.forEach((line) => {
    const row = lineFromRow(line);
    initial[line.itemN] = { q: row.q, a: row.a, u: row.u, note: row.note || "" };
  });
  const locked = count.status === "submitted" && user.role !== "ADMIN";
  return (
    <>
      <div className="toolbar">
        <Link className="btn btn-ghost" href={`/lager?shop=${count.shopCode}`}>
          Lager
        </Link>
        <strong>
          {shopByCode(count.shopCode)?.name} · {dateIsoOf(count.countDate)} · {count.countedBy}
        </strong>
      </div>
      {locked ? <div className="hint">This count is submitted. Graeme can reopen it to change the numbers.</div> : null}
      <CountBoard countId={count.id} items={items} initial={initial} rules={rules} locked={locked} />
    </>
  );
}
