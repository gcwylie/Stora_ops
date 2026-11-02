import { NextResponse } from "next/server";
import { assertShop } from "../../../../../lib/access";
import { prisma } from "../../../../../lib/db";
import { stockWorkbook } from "../../../../../lib/excel";
import { catalogueFor, dateIsoOf, lineFromRow } from "../../../../../lib/load";
import { getSession } from "../../../../../lib/session";
import type { ShopCode } from "../../../../../lib/shops";

export async function GET(_request: Request, context: { params: Promise<{ countId: string }> }) {
  const user = await getSession();
  if (!user) return new NextResponse("Log in first.", { status: 401 });
  const { countId } = await context.params;
  const count = await prisma.stockCount.findUnique({ where: { id: countId }, include: { lines: true } });
  if (!count) return new NextResponse("Not found", { status: 404 });
  try {
    assertShop(user, count.shopCode);
  } catch {
    return new NextResponse("Not your shop", { status: 403 });
  }
  const items = await catalogueFor(count.shopCode as ShopCode);
  const lines: Record<number, ReturnType<typeof lineFromRow>> = {};
  count.lines.forEach((line) => {
    lines[line.itemN] = lineFromRow(line);
  });
  const file = await stockWorkbook({
    shopCode: count.shopCode,
    date: dateIsoOf(count.countDate),
    countedBy: count.countedBy,
    items,
    lines,
  });
  return new NextResponse(new Uint8Array(file.body), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
    },
  });
}
