"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCountLine } from "@/lib/actions";
import { formatSek2 } from "@/lib/format";
import {
  amount,
  baseTotal,
  counted,
  tooMuchText,
  valueOf,
  type LineCount,
  type StockItem,
  type StockRules,
} from "@/lib/stock-math";

type LineState = LineCount & { note: string };

export function CountBoard({
  countId,
  items,
  initial,
  rules,
  locked,
}: {
  countId: string;
  items: StockItem[];
  initial: Record<number, LineState>;
  rules: StockRules;
  locked: boolean;
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Record<number, LineState>>(initial);
  const [filter, setFilter] = useState("");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Promise<void>>(Promise.resolve());

  const cats = useMemo(() => {
    const seen: string[] = [];
    items.forEach((item) => {
      if (!seen.includes(item.category)) seen.push(item.category);
    });
    return seen;
  }, [items]);

  function persist(item: StockItem, next: LineState) {
    setLines((prev) => ({ ...prev, [item.n]: next }));
    const job = pending.then(() =>
      saveCountLine({
        countId,
        itemN: item.n,
        qty: next.q,
        altQty: next.a,
        altUnit: next.u,
        note: next.note,
      }),
    );
    setPending(job);
  }

  function update(item: StockItem, patch: Partial<LineState>) {
    const current = lines[item.n] || { q: null, a: null, u: item.alts[0]?.u || null, note: "" };
    persist(item, { ...current, ...patch });
  }

  const visible = items.filter((item) => {
    if (filter === "@todo" && counted(lines[item.n])) return false;
    if (filter && filter !== "@todo" && item.category !== filter) return false;
    if (query && !`${item.name} ${item.supplier}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const done = items.filter((item) => counted(lines[item.n])).length;
  let lastCat = "";

  return (
    <>
      <div className="hint">
        {done} of {items.length} counted. Box 1 is whole ordering units. Box 2 is the leftover, in another unit. The same goods never go in both.
      </div>
      <div className="bar-line" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, marginBottom: 12 }} />
      <input className="search" placeholder="Search item or supplier" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="chips">
        <button className={`chip ${filter === "" ? "sel" : ""}`} type="button" onClick={() => setFilter("")}>
          All <i>{done}/{items.length}</i>
        </button>
        <button className={`chip ${filter === "@todo" ? "sel" : ""}`} type="button" onClick={() => setFilter("@todo")}>
          Not counted <i>{items.length - done}</i>
        </button>
        {cats.map((cat) => {
          const rows = items.filter((item) => item.category === cat);
          const got = rows.filter((item) => counted(lines[item.n])).length;
          return (
            <button key={cat} className={`chip ${filter === cat ? "sel" : ""}`} type="button" onClick={() => setFilter(cat)}>
              {cat.replace(/^\d+\.\s*/, "")} <i>{got}/{rows.length}</i>
            </button>
          );
        })}
      </div>
      {visible.map((item) => {
        const line = lines[item.n] || { q: null, a: null, u: item.alts[0]?.u || null, note: "" };
        const showHead = item.category !== lastCat;
        lastCat = item.category;
        const warn = tooMuchText(item, line, rules);
        const base = baseTotal(item, line);
        return (
          <div key={item.n}>
            {showHead ? <h2 className="sec">{item.category.replace(/^\d+\.\s*/, "")}</h2> : null}
            <article className={`item ${counted(line) ? "done" : ""} ${line.note ? "hasnote" : ""}`}>
              <h3>{item.name}</h3>
              <div className="meta">{item.supplier}</div>
              <div className="unit">You order this in: {item.orderUnit}</div>
              {item.note ? <div className="meta">{item.note}</div> : null}
              <div className="boxes">
                <div className="bx one">
                  <div className="meta">{item.primaryUnit}</div>
                  <div className="stepper">
                    <button
                      type="button"
                      aria-label="one less"
                      disabled={locked}
                      onClick={() => update(item, { q: Math.max(0, Math.round(((line.q || 0) - 1) * 1000) / 1000) })}
                    >
                      −
                    </button>
                    <input
                      inputMode="decimal"
                      aria-label="how many"
                      disabled={locked}
                      value={line.q == null ? "" : String(line.q)}
                      placeholder="tap to type"
                      onChange={(event) => update(item, { q: event.target.value === "" ? null : Number(event.target.value.replace(",", ".")) })}
                    />
                    <button
                      type="button"
                      aria-label="one more"
                      disabled={locked}
                      onClick={() => update(item, { q: Math.round(((line.q || 0) + 1) * 1000) / 1000 })}
                    >
                      +
                    </button>
                  </div>
                </div>
                {item.alts.length ? (
                  <div className="bx two">
                    <div className="meta">Also count in</div>
                    <div className="looseline">
                      <input
                        inputMode="decimal"
                        aria-label="loose amount"
                        disabled={locked}
                        value={line.a == null ? "" : String(line.a)}
                        placeholder="tap to type"
                        onChange={(event) =>
                          update(item, {
                            a: event.target.value === "" ? null : Number(event.target.value.replace(",", ".")),
                            u: line.u || item.alts[0].u,
                          })
                        }
                      />
                      <select
                        aria-label="loose unit"
                        disabled={locked}
                        value={line.u || item.alts[0].u}
                        onChange={(event) => update(item, { u: event.target.value })}
                      >
                        {item.alts.map((alt) => (
                          <option key={alt.u} value={alt.u}>
                            {alt.u}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="sumline">
                {counted(line) ? (
                  <>
                    {(line.q ? `${line.q} × ${item.primaryUnit}` : "") +
                      (line.a ? `${line.q ? " + " : ""}${amount(line.a, line.u || "")}` : "") ||
                      "0"}
                    {base ? ` = ${amount(base.v, base.u)}` : ""} · <b>{formatSek2(valueOf(item, line))} SEK</b>
                  </>
                ) : item.alts.length ? (
                  `Box 1: whole ${item.primaryUnit}. Box 2: whatever is left, in ${item.alts.map((alt) => alt.u).join(" or ")}.`
                ) : (
                  "Nothing counted yet."
                )}
              </div>
              {warn ? <div className="bigwarn">{warn}</div> : null}
              {line.note ? <div className="noteshown">{line.note}</div> : null}
              {!locked ? (
                <button
                  className="btn btn-ghost"
                  type="button"
                  style={{ marginTop: 8 }}
                  onClick={() => {
                    const note = window.prompt("Note for this item", line.note || "") ?? line.note;
                    update(item, { note });
                  }}
                >
                  {line.note ? "Edit note" : "+ Add a note"}
                </button>
              ) : null}
            </article>
          </div>
        );
      })}
      <button
        className="btn btn-navy"
        type="button"
        onClick={async () => {
          await pending;
          router.push(`/lager/${countId}/review`);
        }}
      >
        Done — check the numbers
      </button>
    </>
  );
}
