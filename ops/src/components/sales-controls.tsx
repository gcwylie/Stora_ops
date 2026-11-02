"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSalesDay, saveStaffCost, saveTarget } from "@/lib/actions";
import { formatKrOre } from "@/lib/format";
import type { ShopCode } from "@/lib/shops";

export function TargetControl({ value }: { value: number }) {
  const router = useRouter();
  const [pct, setPct] = useState(value);
  return (
    <label className="field" style={{ flexDirection: "row", alignItems: "center" }}>
      Year target
      <input
        type="range"
        min={0}
        max={25}
        step={1}
        value={pct}
        onChange={(event) => setPct(Number(event.target.value))}
        onMouseUp={() => saveTarget(pct).then(() => router.refresh())}
        onTouchEnd={() => saveTarget(pct).then(() => router.refresh())}
        style={{ width: 140 }}
      />
      <b>{pct}%</b>
    </label>
  );
}

export function SalesEntry({
  today,
  shops,
  preset,
}: {
  today: string;
  shops: { code: ShopCode; name: string }[];
  preset?: { date: string; shop: string; excl: string; incl: string };
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  return (
    <form
      className="field-row"
      onSubmit={async (event) => {
        event.preventDefault();
        await saveSalesDay(new FormData(event.currentTarget));
        setMessage("Saved. Labour % and the year target use this figure now.");
        router.refresh();
      }}
    >
      <label className="field">
        Date
        <input type="date" name="date" defaultValue={preset?.date || today} required />
      </label>
      <label className="field">
        Shop
        <select name="shop" defaultValue={preset?.shop || shops[0]?.code}>
          {shops.map((shop) => (
            <option key={shop.code} value={shop.code}>
              {shop.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Excl. VAT, kr
        <input name="excl" inputMode="decimal" placeholder="12 500" defaultValue={preset?.excl || ""} required />
      </label>
      <label className="field">
        Incl. VAT, kr
        <input name="incl" inputMode="decimal" placeholder="14 000" defaultValue={preset?.incl || ""} />
      </label>
      <button className="btn btn-navy" type="submit">
        Save day
      </button>
      {message ? <span className="meta">{message}</span> : null}
    </form>
  );
}

export function WageInput({ month, shop, value }: { month: string; shop: string; value: number }) {
  const router = useRouter();
  return (
    <input
      className="wage-input"
      inputMode="decimal"
      defaultValue={value ? value.toLocaleString("sv-SE") : ""}
      placeholder="—"
      aria-label={`Staff cost ${month}`}
      onBlur={async (event) => {
        await saveStaffCost(month, shop, event.target.value);
        router.refresh();
      }}
    />
  );
}

export function RecentDays({
  rows,
}: {
  rows: { iso: string; shop: string; name: string; excl: string; incl: string }[];
}) {
  if (!rows.length) return <p className="meta">No days entered yet.</p>;
  return (
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Shop</th>
          <th className="num">Excl. VAT</th>
          <th className="num">Incl. VAT</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.iso}-${row.shop}`}>
            <td>{row.iso}</td>
            <td>{row.name}</td>
            <td className="num">{row.excl ? formatKrOre(Number(row.excl)) : "—"}</td>
            <td className="num">{row.incl ? formatKrOre(Number(row.incl)) : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
