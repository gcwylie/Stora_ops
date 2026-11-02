import ExcelJS from "exceljs";
import { amount, baseTotal, countTotals, counted, valueOf, type LineCount, type StockItem } from "./stock-math";
import { shopByCode } from "./shops";

export type ExportLine = LineCount & { ack?: boolean };

const COLUMNS = [
  "No.",
  "Category",
  "Item",
  "Supplier",
  "Ordering unit",
  "Whole units",
  "Second count",
  "Second unit",
  "Total amount",
  "Amount unit",
  "Price per unit (SEK)",
  "Value (SEK)",
  "Counted",
  "Note from the site",
];

export async function stockWorkbook(input: {
  shopCode: string;
  date: string;
  countedBy: string;
  items: StockItem[];
  lines: Record<number, ExportLine | undefined>;
}): Promise<{ filename: string; body: Buffer }> {
  const shop = shopByCode(input.shopCode);
  const siteName = shop ? `Stora Bageriet – ${shop.address}` : input.shopCode;
  const totals = countTotals(input.items, input.lines);
  const wb = new ExcelJS.Workbook();
  wb.creator = "Stora ops";

  const summary = wb.addWorksheet("Summary");
  summary.columns = [{ width: 44 }, { width: 18 }, { width: 22 }, { width: 16 }];
  const title = summary.addRow(["Stock count – Stora Bageriet"]);
  title.font = { bold: true, size: 16 };
  summary.addRow([]);
  summary.addRow(["Site", siteName]);
  summary.addRow(["Date", input.date]);
  summary.addRow(["Counted by", input.countedBy]);
  summary.addRow(["Items counted", totals.done]);
  summary.addRow(["Items on the list for this site", totals.total]);
  const totalRow = summary.addRow(["Total stock value (SEK)", Math.round(totals.sum * 100) / 100]);
  totalRow.font = { bold: true };
  summary.addRow([]);
  const catHead = summary.addRow(["Value by category", "Items counted", "Value (SEK)", "Share of total"]);
  catHead.font = { bold: true };
  const categories = [...new Set(input.items.map((item) => item.category))];
  categories.forEach((category) => {
    if (!totals.catTotal[category]) return;
    const value = Math.round((totals.byCat[category] || 0) * 100) / 100;
    summary.addRow([
      category,
      totals.catDone[category] || 0,
      value,
      totals.sum ? value / totals.sum : 0,
    ]);
  });
  const catTotal = summary.addRow(["Total", totals.done, Math.round(totals.sum * 100) / 100, totals.sum ? 1 : 0]);
  catTotal.font = { bold: true };
  summary.addRow([]);
  summary.addRow(["Value by supplier"]).font = { bold: true };
  const supHead = summary.addRow(["Supplier", "Value (SEK)"]);
  supHead.font = { bold: true };
  Object.entries(totals.bySup)
    .sort((a, b) => b[1] - a[1])
    .forEach(([supplier, value]) => summary.addRow([supplier, Math.round(value * 100) / 100]));

  const notes = input.items.filter((item) => input.lines[item.n]?.note);
  summary.addRow([]);
  summary.addRow(["Notes from the site", notes.length ? "" : "none"]);
  if (notes.length) {
    summary.addRow(["Item", "Counted", "Note"]).font = { bold: true };
    notes.forEach((item) => {
      const line = input.lines[item.n];
      summary.addRow([item.name, counted(line) ? "yes" : "no", line?.note || ""]);
    });
  }

  const sheet = wb.addWorksheet("Stock count");
  sheet.columns = [6, 28, 44, 24, 28, 14, 14, 16, 14, 14, 20, 16, 12, 52].map((width) => ({ width }));
  sheet.addRow(["Site", siteName, "Date", input.date, "Counted by", input.countedBy, "Company", "Stora Bageriet"]);
  sheet.addRow([]);
  const head = sheet.addRow(COLUMNS);
  head.font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 3 }];
  let n = 0;
  input.items.forEach((item) => {
    const line = input.lines[item.n];
    if (!line || (!counted(line) && !line.note)) return;
    n += 1;
    const base = counted(line) ? baseTotal(item, line) : null;
    sheet.addRow([
      n,
      item.category,
      item.name,
      item.supplier,
      item.orderUnit,
      line.q == null ? "" : line.q,
      line.a == null ? "" : line.a,
      line.a ? line.u || "" : "",
      base ? base.v : "",
      base ? base.u : "",
      item.priceSek,
      counted(line) ? Math.round(valueOf(item, line) * 100) / 100 : "",
      counted(line) ? "yes" : "no",
      line.note || "",
    ]);
  });
  sheet.addRow([]);
  const grand = sheet.addRow(["", "", "TOTAL", "", "", "", "", "", "", "", "", Math.round(totals.sum * 100) / 100]);
  grand.font = { bold: true };

  const raw = await wb.xlsx.writeBuffer();
  const body = Buffer.from(raw);
  const filename = `Stock count SB ${input.shopCode} ${input.date}.xlsx`;
  return { filename, body };
}

export function stockTsv(input: {
  shopCode: string;
  date: string;
  countedBy: string;
  items: StockItem[];
  lines: Record<number, ExportLine | undefined>;
}): string {
  const shop = shopByCode(input.shopCode);
  const siteName = shop ? `${shop.name}` : input.shopCode;
  const header = ["Site", "Date", "Counted by", ...COLUMNS.slice(1)];
  const rows = [header];
  input.items.forEach((item) => {
    const line = input.lines[item.n];
    if (!line || (!counted(line) && !line.note)) return;
    const base = counted(line) ? baseTotal(item, line) : null;
    rows.push([
      siteName,
      input.date,
      input.countedBy,
      item.category,
      item.name,
      item.supplier,
      item.orderUnit,
      line.q == null ? "" : String(line.q),
      line.a == null ? "" : String(line.a),
      line.a ? line.u || "" : "",
      base ? String(base.v) : "",
      base ? base.u : "",
      String(item.priceSek),
      counted(line) ? String(Math.round(valueOf(item, line) * 100) / 100) : "",
      counted(line) ? "yes" : "no",
      line.note || "",
    ]);
  });
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? "");
          return /[\t\n"]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join("\t"),
    )
    .join("\n");
}

export function describeLine(item: StockItem, line: LineCount): string {
  const parts: string[] = [];
  if (line.q) parts.push(`${line.q} × ${item.primaryUnit}`);
  if (line.a) {
    const unit = line.u || item.alts[0]?.u || "";
    parts.push(amount(line.a, unit) + (unit.indexOf("box") === 0 ? "" : " loose"));
  }
  const base = baseTotal(item, line);
  return (parts.join(" + ") || "0") + (base ? ` = ${amount(base.v, base.u)}` : "");
}
