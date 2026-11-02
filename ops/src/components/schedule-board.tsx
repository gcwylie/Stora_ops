"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { clearWeek, importWeekJson, queueCaspeco, saveHourlyRate, saveLabourSettings, saveShift } from "@/lib/actions";
import { addDays, dayHeader, formatRange, isoWeekNumber, lastYearSameWeekday } from "@/lib/dates";
import { formatHours, formatKr, formatPctRatio } from "@/lib/format";
import {
  dayLabour,
  fohBucketFor,
  fohNeeded,
  FOH_COVERAGE,
  hoursFromTimes,
  loadedHourly,
  parseClock,
  sumDays,
  withinTarget,
  type LabourSettings,
} from "@/lib/labour";
import type { Cell, RosterPerson } from "@/lib/load";
import {
  effectiveGroup,
  passCatalog,
  shiftById,
  shiftName,
  shiftsFor,
  toneFor,
} from "@/lib/shifts";
import { shopByCode, type ShopCode } from "@/lib/shops";

const GROUP_ORDER = ["Bakery", "Kitchen", "FOH", "Admin"];

type CellMap = Record<string, { shiftId: string; start: string; end: string }>;

function keyOf(id: string, day: number) {
  return `${id}|${day}`;
}

function indexCells(cells: Cell[]): CellMap {
  const map: CellMap = {};
  cells.forEach((cell) => {
    map[keyOf(cell.employeeId, cell.dayIndex)] = { shiftId: cell.shiftId, start: cell.start, end: cell.end };
  });
  return map;
}

export function ScheduleBoard({
  shop,
  monday,
  people,
  cells,
  otherCells,
  salesByIso,
  lastYearByIso,
  settings,
  yearTargetPct,
  bookmarklet,
  shops,
}: {
  shop: ShopCode;
  shops: { code: ShopCode; name: string }[];
  monday: string;
  people: RosterPerson[];
  cells: Cell[];
  otherCells: Cell[];
  salesByIso: Record<string, number>;
  lastYearByIso: Record<string, number>;
  settings: LabourSettings;
  yearTargetPct: number;
  bookmarklet: string;
}) {
  const router = useRouter();
  const [board, setBoard] = useState<"personal" | "pass">("personal");
  const [cellMap, setCellMap] = useState(() => indexCells(cells));
  const [otherMap] = useState(() => indexCells(otherCells));
  const [rates, setRates] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(people.map((person) => [person.id, person.hourlyRate])),
  );
  const [localSettings, setLocalSettings] = useState(settings);
  const [target, setTarget] = useState(yearTargetPct);
  const [panel, setPanel] = useState("");
  const [queued, setQueued] = useState<{ count: number; unmatched: string[] } | null>(null);
  const shopName = shopByCode(shop)?.name || shop;
  const otherName = shop === "SE88" ? "Östermalm" : "St Erik";

  const roster = useMemo(() => {
    const home = people.filter(
      (person) => person.active && (person.homeShopCode === shop || person.alsoShopCode === shop),
    );
    const seen = new Set(home.map((person) => person.id));
    const extras = people.filter((person) => !seen.has(person.id) && Object.keys(cellMap).some((key) => key.startsWith(`${person.id}|`)));
    const list = [...home, ...extras];
    return list.sort((a, b) => {
      const ga = GROUP_ORDER.indexOf(effectiveGroup(shop, a.groupName));
      const gb = GROUP_ORDER.indexOf(effectiveGroup(shop, b.groupName));
      if (ga !== gb) return ga - gb;
      return a.name.localeCompare(b.name, "sv");
    });
  }, [people, shop, cellMap]);

  function personById(id: string) {
    return people.find((person) => person.id === id);
  }

  function timesFor(person: RosterPerson, day: number) {
    const cell = cellMap[keyOf(person.id, day)];
    if (!cell) return null;
    const template = shiftById(shop, effectiveGroup(shop, person.groupName), cell.shiftId);
    const start = cell.start || template?.start || "";
    const end = cell.end || template?.end || "";
    if (!start || !end) return null;
    return {
      start,
      end,
      custom: Boolean(template && (start !== template.start || end !== template.end)),
      hours: hoursFromTimes(start, end),
    };
  }

  function ratePerson(person: RosterPerson) {
    return {
      group: effectiveGroup(shop, person.groupName),
      hourlyOverride: rates[person.id],
      salary: person.salary,
    };
  }

  const sheet = useMemo(() => {
    const days = [0, 1, 2, 3, 4, 5, 6].map((day) => {
      const iso = addDays(monday, day);
      const working = roster
        .map((person) => {
          const times = timesFor(person, day);
          if (!times) return null;
          return { ...ratePerson(person), hours: times.hours };
        })
        .filter((row): row is NonNullable<typeof row> => Boolean(row));
      return {
        iso,
        label: dayHeader(monday, day).split(" ")[0],
        labour: dayLabour(working, { thisKr: salesByIso[iso] || 0, lastKr: lastYearByIso[iso] || 0 }, localSettings, target),
      };
    });
    return { days, totals: sumDays(days.map((day) => day.labour)) };
    // timesFor closes over cellMap and rates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, cellMap, rates, localSettings, target, monday, salesByIso, lastYearByIso, shop]);

  async function write(person: RosterPerson, day: number, shiftId: string, start?: string, end?: string) {
    const template = shiftById(shop, effectiveGroup(shop, person.groupName), shiftId);
    const nextStart = start || template?.start || "";
    const nextEnd = end || template?.end || "";
    setCellMap((prev) => {
      const next = { ...prev };
      if (!shiftId || shiftId === "off") delete next[keyOf(person.id, day)];
      else next[keyOf(person.id, day)] = { shiftId, start: nextStart, end: nextEnd };
      return next;
    });
    await saveShift({ shop, monday, employeeId: person.id, dayIndex: day, shiftId: shiftId || "off", start: nextStart, end: nextEnd });
  }

  const filled = roster.reduce((sum, person) => sum + [0, 1, 2, 3, 4, 5, 6].filter((day) => cellMap[keyOf(person.id, day)]).length, 0);
  const workingPeople = new Set(roster.filter((person) => [0, 1, 2, 3, 4, 5, 6].some((day) => cellMap[keyOf(person.id, day)])).map((person) => person.id));

  function coverage() {
    if (shop !== "SIB2") return null;
    return (
      <div className="coverage">
        {[0, 1, 2, 3, 4, 5, 6].map((day) => {
          const counts: Record<string, number> = { extra: 0 };
          FOH_COVERAGE.forEach((row) => {
            counts[row.key] = 0;
          });
          roster
            .filter((person) => effectiveGroup(shop, person.groupName) === "FOH")
            .forEach((person) => {
              const shiftId = cellMap[keyOf(person.id, day)]?.shiftId;
              if (!shiftId) return;
              const bucket = fohBucketFor(shiftId);
              if (bucket) counts[bucket] = (counts[bucket] || 0) + 1;
            });
          const needed = fohNeeded(day);
          return (
            <div className="coverage-day" key={day}>
              <b>{dayHeader(monday, day)}</b>
              {FOH_COVERAGE.map((row) => (
                <span key={row.key} data-ok={counts[row.key] === needed[row.key] ? "1" : "0"}>
                  {row.label} {counts[row.key]}/{needed[row.key]}
                </span>
              ))}
              {counts.extra ? <span data-ok="0">Other {counts.extra}/0</span> : null}
            </div>
          );
        })}
      </div>
    );
  }

  function labourTable() {
    const cols = [
      ...sheet.days.map((day) => ({ label: day.label, iso: day.iso, labour: day.labour })),
      { label: "Total", iso: "", labour: null },
    ];
    const total = sheet.totals;
    const value = (pick: (day: (typeof sheet.days)[number]["labour"] | null, isTotal: boolean) => string, ok?: (day: (typeof sheet.days)[number]["labour"] | null, isTotal: boolean) => boolean | null) =>
      cols.map((col, index) => {
        const isTotal = index === cols.length - 1;
        const labour = isTotal ? null : col.labour;
        const flag = ok ? ok(isTotal ? (total as unknown as (typeof sheet.days)[number]["labour"]) : labour, isTotal) : null;
        return (
          <td key={col.label + index} className="num" data-ok={flag == null ? undefined : flag ? "1" : "0"}>
            {pick(isTotal ? null : labour, isTotal)}
          </td>
        );
      });
    const hour = (n: number) => formatHours(n);
    const costOf = (n: number) => (n ? formatKr(n) : "—");
    const bucketHour = (bucket: "foh" | "kitchen" | "bakery" | "admin") =>
      value((day, isTotal) => hour(isTotal ? total.hours[bucket] : day!.hours[bucket]));
    const row = (label: string, cells: React.ReactNode, className = "") => (
      <tr className={className}>
        <td>{label}</td>
        {cells}
      </tr>
    );
    return (
      <div className="sales-card labour-sheet">
        <h2>Labour this week</h2>
        <div className="labour-rates">
          <label>
            FOH kr/h
            <input
              type="number"
              min={0}
              step={0.5}
              value={localSettings.fohAvg}
              onChange={(event) => setLocalSettings({ ...localSettings, fohAvg: Number(event.target.value) })}
              onBlur={() => saveLabourSettings({ fohAvg: localSettings.fohAvg })}
            />
          </label>
          <label>
            Kitchen kr/h
            <input
              type="number"
              min={0}
              step={0.5}
              value={localSettings.kitchenAvg}
              onChange={(event) => setLocalSettings({ ...localSettings, kitchenAvg: Number(event.target.value) })}
              onBlur={() => saveLabourSettings({ kitchenAvg: localSettings.kitchenAvg })}
            />
          </label>
          <label>
            Bakery kr/h
            <input
              type="number"
              min={0}
              step={0.5}
              value={localSettings.bakeryAvg}
              onChange={(event) => setLocalSettings({ ...localSettings, bakeryAvg: Number(event.target.value) })}
              onBlur={() => saveLabourSettings({ bakeryAvg: localSettings.bakeryAvg })}
            />
          </label>
          <label>
            Target FOH %
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={localSettings.targetFohPct}
              onChange={(event) => setLocalSettings({ ...localSettings, targetFohPct: Number(event.target.value) })}
              onBlur={() => saveLabourSettings({ targetFohPct: localSettings.targetFohPct })}
            />
          </label>
        </div>
        <p className="sales-legend">
          Labour is FOH + kitchen (including prep). kr/h on each person is pay: 140 under 20, 153 from 20, Teo and Mika 165, James 160. Cost and labour % add 12% holiday pay and 31.42% employer socials. Bakers and Graeme are salary, so they sit outside FOH cost until a kr/h is typed. Last year is the same weekday of the same week. Target FOH hours = target sales × 21% ÷ loaded FOH kr/h.
        </p>
        <table>
          <thead>
            <tr>
              <th></th>
              {sheet.days.map((day) => (
                <th key={day.iso} className="num">
                  {day.label} {Number(day.iso.slice(8))}
                  /{Number(day.iso.slice(5, 7))}
                  <small style={{ display: "block", fontWeight: 500 }}>
                    vs {Number(lastYearSameWeekday(day.iso).slice(8))}/{Number(lastYearSameWeekday(day.iso).slice(5, 7))} ’
                    {lastYearSameWeekday(day.iso).slice(2, 4)}
                  </small>
                </th>
              ))}
              <th className="num">Total</th>
            </tr>
          </thead>
          <tbody>
            {row("Sales", value((day, isTotal) => (isTotal ? (total.used ? formatKr(total.used) : "—") : day!.sales.used ? formatKr(day!.sales.used) : "—")))}
            {row("Last year", value((day, isTotal) => (isTotal ? (total.lastKr ? formatKr(total.lastKr) : "—") : day!.sales.lastKr ? formatKr(day!.sales.lastKr) : "—")))}
            {row(
              `Target sales (+${target}%)`,
              value((day, isTotal) => (isTotal ? (total.targetSales ? formatKr(total.targetSales) : "—") : day!.targetSales ? formatKr(day!.targetSales) : "—")),
            )}
            {row("Target FOH h", value((day, isTotal) => hour(isTotal ? total.targetHours : day!.targetHours)))}
            {row("FOH hours", bucketHour("foh"))}
            {row("FOH cost", value((day, isTotal) => costOf(isTotal ? total.fohCost : day!.fohCost)))}
            {row(
              "FOH %",
              value(
                (day, isTotal) => formatPctRatio(isTotal ? total.fohPct : day!.fohCost / (day!.sales.used || NaN)),
                (day, isTotal) => withinTarget(isTotal ? total.fohCost : day!.fohCost, isTotal ? total.used : day!.sales.used, localSettings.targetFohPct),
              ),
            )}
            {row("Kitchen hours", bucketHour("kitchen"))}
            {row("Kitchen cost", value((day, isTotal) => costOf(isTotal ? total.kitCost : day!.kitCost)))}
            {row("Kitchen %", value((day, isTotal) => formatPctRatio(isTotal ? total.kitCost / (total.used || NaN) : day!.kitCost / (day!.sales.used || NaN))))}
            {row("Total cost", value((day, isTotal) => costOf(isTotal ? total.shopCost : day!.shopCost)), "labour-total")}
            {row(
              "Labour %",
              value(
                (day, isTotal) => formatPctRatio(isTotal ? total.labourPct : day!.shopCost / (day!.sales.used || NaN)),
                (day, isTotal) => withinTarget(isTotal ? total.shopCost : day!.shopCost, isTotal ? total.used : day!.sales.used, localSettings.targetFohPct),
              ),
              "labour-total",
            )}
            {row("Bakery hours", bucketHour("bakery"), "muted")}
            {row("Bakery cost", value((day, isTotal) => costOf(isTotal ? total.bakeCost : day!.bakeCost)), "muted")}
            {row("Bakery %", value((day, isTotal) => formatPctRatio(isTotal ? total.bakePct : day!.bakeCost / (day!.sales.used || NaN))), "muted")}
            {row("Admin hours", bucketHour("admin"), "muted")}
            {row("Admin cost", value((day, isTotal) => costOf(isTotal ? total.adminCost : day!.adminCost)), "muted")}
          </tbody>
        </table>
      </div>
    );
  }

  function away(person: RosterPerson, day: number) {
    const other = otherMap[keyOf(person.id, day)];
    if (!other) return null;
    const template = shiftById(shop === "SE88" ? "SIB2" : "SE88", effectiveGroup(shop === "SE88" ? "SIB2" : "SE88", person.groupName), other.shiftId);
    const label = template ? shiftName(template.label) : other.shiftId;
    const clock = other.start && other.end ? ` · ${other.start}–${other.end}` : "";
    return (
      <div className="away-chip">
        {otherName} · {label}
        {clock}
      </div>
    );
  }

  function timeRow(person: RosterPerson, day: number) {
    const times = timesFor(person, day);
    if (!times) return null;
    return (
      <div className="cell-times" key={`${times.start}-${times.end}`} data-custom={times.custom ? "1" : undefined}>
        <input
          className="time-input"
          defaultValue={times.start}
          aria-label="Start"
          onBlur={(event) => {
            const end = parseClock(event.currentTarget.parentElement?.querySelector<HTMLInputElement>('[data-bound="end"]')?.value || times.end);
            const start = parseClock(event.target.value);
            if (start && end) void write(person, day, cellMap[keyOf(person.id, day)].shiftId, start, end);
          }}
        />
        <span>–</span>
        <input
          className="time-input"
          data-bound="end"
          defaultValue={times.end}
          aria-label="End"
          onBlur={(event) => {
            const start = parseClock(event.currentTarget.parentElement?.querySelector<HTMLInputElement>(".time-input")?.value || times.start);
            const end = parseClock(event.target.value);
            if (start && end) void write(person, day, cellMap[keyOf(person.id, day)].shiftId, start, end);
          }}
        />
        <em>{formatHours(times.hours)}h</em>
      </div>
    );
  }

  function personal() {
    const groups: { group: string; people: RosterPerson[] }[] = [];
    roster.forEach((person) => {
      const group = effectiveGroup(shop, person.groupName);
      const last = groups[groups.length - 1];
      if (!last || last.group !== group) groups.push({ group, people: [person] });
      else last.people.push(person);
    });
    return (
      <table>
        <thead>
          <tr>
            <th className="name">Person</th>
            <th>kr/h</th>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <th key={day}>{dayHeader(monday, day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((block) => (
            <Fragment key={block.group}>
              <tr className="group-row">
                <td colSpan={9}>{block.group}</td>
              </tr>
              {block.people.map((person) => {
                const options = shiftsFor(shop, person.groupName);
                const hours = [0, 1, 2, 3, 4, 5, 6].reduce((sum, day) => sum + (timesFor(person, day)?.hours || 0), 0);
                return (
                  <tr key={person.id}>
                    <td className="name">
                      {person.name}
                      {hours ? <small>{formatHours(hours)} h</small> : null}
                      {person.alsoShopCode ? <small className="site-tag">Works Östermalm + St Erik</small> : null}
                    </td>
                    <td className="rate">
                      <input
                        className="rate-input"
                        inputMode="decimal"
                        placeholder={person.salary && !rates[person.id] ? "salary" : String(loadedHourly({ group: effectiveGroup(shop, person.groupName), salary: false }, localSettings) ? Math.round(rateBase(person)) : "0")}
                        value={rates[person.id] ? String(rates[person.id]) : ""}
                        onChange={(event) => {
                          const n = Number(event.target.value.replace(",", "."));
                          setRates({ ...rates, [person.id]: event.target.value && n > 0 ? n : null });
                        }}
                        onBlur={(event) => saveHourlyRate(person.id, event.target.value)}
                      />
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const cell = cellMap[keyOf(person.id, day)];
                      const shiftId = cell?.shiftId || "off";
                      const clash = Boolean(cell && otherMap[keyOf(person.id, day)]);
                      return (
                        <td key={day}>
                          <div className="cell-shift" data-clash={clash ? "1" : undefined}>
                            <select
                              className={`shift ${shiftId === "off" ? "off" : toneFor(shop, person.groupName)}`}
                              value={shiftId}
                              aria-label={`${person.name} ${dayHeader(monday, day)}`}
                              onChange={(event) => write(person, day, event.target.value)}
                            >
                              <option value="off">Off</option>
                              {options.map((shift) => (
                                <option key={shift.id} value={shift.id}>
                                  {shift.label}
                                </option>
                              ))}
                            </select>
                            {timeRow(person, day)}
                            {away(person, day)}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    );
  }

  function rateBase(person: RosterPerson) {
    const group = effectiveGroup(shop, person.groupName);
    if (group === "Kitchen") return localSettings.kitchenAvg;
    if (group === "Bakery") return localSettings.bakeryAvg;
    return localSettings.fohAvg;
  }

  function pass() {
    const blocks = passCatalog(shop);
    return (
      <table>
        <thead>
          <tr>
            <th className="name">Pass</th>
            {[0, 1, 2, 3, 4, 5, 6].map((day) => (
              <th key={day}>{dayHeader(monday, day)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {blocks.map((block) => {
            const inGroup = roster.filter((person) => effectiveGroup(shop, person.groupName) === block.group);
            const here = new Set(inGroup.map((person) => person.id));
            const visitors = people.filter((person) => {
              if (!person.active || here.has(person.id)) return false;
              if (shop === "SE88") return person.groupName === "FOH" && person.homeShopCode !== "SE88";
              if (block.group === "FOH") return person.groupName === "FOH" || person.homeShopCode === "SE88";
              return person.groupName === block.group;
            });
            return (
              <Fragment key={block.group}>
                <tr className="group-row">
                  <td colSpan={8}>{block.group}</td>
                </tr>
                {block.shifts.map((shift) => (
                  <tr key={shift.id}>
                    <td className="name">
                      {shiftName(shift.label)}
                      <small>
                        {shift.start}–{shift.end}
                      </small>
                    </td>
                    {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                      const assigned = inGroup.filter((person) => cellMap[keyOf(person.id, day)]?.shiftId === shift.id);
                      const taken = new Set(assigned.map((person) => person.id));
                      return (
                        <td key={day}>
                          <div className="pass-cell">
                            {assigned.map((person) => (
                              <div key={person.id}>
                                <select
                                  className={`shift ${toneFor(shop, person.groupName)}`}
                                  value={person.id}
                                  onChange={(event) => {
                                    const nextId = event.target.value;
                                    const times = timesFor(person, day);
                                    void write(person, day, "off");
                                    if (nextId && nextId !== "off") {
                                      const next = personById(nextId);
                                      if (next) void write(next, day, shift.id, times?.start, times?.end);
                                    }
                                  }}
                                >
                                  {[...inGroup, ...visitors].map((option) => (
                                    <option key={option.id} value={option.id}>
                                      {option.name}
                                    </option>
                                  ))}
                                  <option value="off">Remove</option>
                                </select>
                                {timeRow(person, day)}
                                {away(person, day)}
                              </div>
                            ))}
                            <select
                              className="shift off"
                              value=""
                              aria-label={`Add ${shift.label}`}
                              onChange={(event) => {
                                const next = personById(event.target.value);
                                if (next) void write(next, day, shift.id);
                                event.target.value = "";
                              }}
                            >
                              <option value="">Add</option>
                              {inGroup
                                .filter((person) => !taken.has(person.id))
                                .map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {person.name}
                                  </option>
                                ))}
                              {visitors
                                .filter((person) => !taken.has(person.id))
                                .map((person) => (
                                  <option key={person.id} value={person.id}>
                                    {person.name} · {otherName}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    );
  }

  const prev = addDays(monday, -7);
  const next = addDays(monday, 7);
  const hint =
    board === "pass"
      ? "Each row is a named pass. The names in the cells are who is on it that day. Add or swap people here, or switch back to Personal."
      : shop === "SE88"
        ? "Pick a named shift, then trim the times if you need the hours down. People who also work Östermalm show that shop under their name. Add Östermalm staff from Pass view."
        : "FOH is 7 Mon–Thu and 9 Fri–Sun: Open, AM Runner, FOH PM, PM Runner 08–17, PM Runner 11–17, two closes. Weekend adds two extra FOH PM. People who also work St Erik show that shop under their name.";

  return (
    <>
      <div className="toolbar">
        <div className="pills">
          {shops.map((row) => (
            <a key={row.code} className={`pill ${shop === row.code ? "active" : ""}`} href={`/schema?shop=${row.code}&week=${monday}`}>
              {row.name}
            </a>
          ))}
        </div>
        <div className="week-nav">
          <a className="btn-icon" href={`/schema?shop=${shop}&week=${prev}`} aria-label="Previous week">
            ‹
          </a>
          <strong>Week {isoWeekNumber(monday)}</strong>
          <a className="btn-icon" href={`/schema?shop=${shop}&week=${next}`} aria-label="Next week">
            ›
          </a>
        </div>
        <div className="pills">
          <button className={`pill ${board === "personal" ? "active" : ""}`} onClick={() => setBoard("personal")} type="button">
            Personal
          </button>
          <button className={`pill ${board === "pass" ? "active" : ""}`} onClick={() => setBoard("pass")} type="button">
            Pass
          </button>
        </div>
        <div className="spacer" />
        <button
          className="btn btn-ghost"
          type="button"
          onClick={() => {
            const payload = {
              site: shop,
              week: isoWeekNumber(monday),
              monday,
              shifts: Object.entries(cellMap).map(([key, cell]) => {
                const [employeeId, day] = key.split("|");
                const person = personById(employeeId);
                const template = person ? shiftById(shop, effectiveGroup(shop, person.groupName), cell.shiftId) : undefined;
                return {
                  name: person?.name,
                  day: Number(day),
                  shiftId: cell.shiftId,
                  label: template?.label || cell.shiftId,
                  start: cell.start,
                  end: cell.end,
                  hours: hoursFromTimes(cell.start, cell.end),
                };
              }),
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `stora-schema-w${payload.week}-${shop}.json`;
            link.click();
            URL.revokeObjectURL(url);
          }}
        >
          Export week
        </button>
        <label className="btn btn-ghost">
          Import week
          <input
            type="file"
            accept="application/json"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const text = await file.text();
              const result = await importWeekJson(shop, monday, text);
              setPanel(result.missing.length ? `Imported ${result.placed}. Not on the roster: ${result.missing.join(", ")}.` : `Imported ${result.placed} shifts.`);
              router.refresh();
            }}
          />
        </label>
        <button
          className="btn btn-brand"
          type="button"
          onClick={async () => {
            if (!window.confirm(`Save week ${isoWeekNumber(monday)} for ${shopName} in this app, ready to send?\n\nCaspeco is not changed until you open Caspeco and click the bookmark. Drafts stay unpublished.`)) return;
            const payload = await queueCaspeco(shop, monday);
            setQueued({ count: payload.shifts.length, unmatched: payload.unmatched });
          }}
        >
          Send to Caspeco
        </button>
        <button
          className="btn btn-ghost"
          type="button"
          onClick={async () => {
            if (!window.confirm("Clear every shift on this shop for this week?")) return;
            await clearWeek(shop, monday);
            setCellMap({});
            router.refresh();
          }}
        >
          Clear week
        </button>
      </div>
      {coverage()}
      <div className="stats">
        <div className="stat">
          <b>{filled}</b>
          <span>Shifts placed</span>
        </div>
        <div className="stat">
          <b>{workingPeople.size}</b>
          <span>People on the week</span>
        </div>
        <div className="stat">
          <b>{formatHours(sheet.totals.hours.foh + sheet.totals.hours.kitchen)}</b>
          <span>FOH + kitchen h</span>
        </div>
        <div className="stat">
          <b>{sheet.totals.shopCost ? formatKr(sheet.totals.shopCost) : "—"}</b>
          <span>FOH + kitchen cost</span>
        </div>
        <div className="stat">
          <b>{formatPctRatio(sheet.totals.labourPct)}</b>
          <span>{sheet.days.some((day) => day.labour.sales.lastYear) ? `FOH + kitchen vs last year · target ${localSettings.targetFohPct}%` : `FOH + kitchen · target ${localSettings.targetFohPct}%`}</span>
        </div>
        <div className="stat">
          <b>{formatPctRatio(sheet.totals.bakePct)}</b>
          <span>Bakery %</span>
        </div>
        <div className="stat">
          <b>{formatRange(monday)}</b>
          <span>Dates</span>
        </div>
      </div>
      {labourTable()}
      <div className="hint">{panel || hint}</div>
      <div className={`board ${board === "pass" ? "pass-view" : ""}`}>{board === "pass" ? pass() : personal()}</div>
      <aside className={`send-panel ${queued ? "open" : ""}`}>
        <button className="btn" type="button" onClick={() => setQueued(null)} aria-label="Close" style={{ position: "absolute", top: 8, right: 8, background: "transparent", color: "#d7d9e6" }}>
          ×
        </button>
        <h2>{queued ? `${queued.count} shifts queued` : "Queued for Caspeco"}</h2>
        <p>
          Week {isoWeekNumber(monday)} · {shopName} is saved in this app only. When you are done, open Caspeco and click <strong>Send queued week</strong>.
          {queued?.unmatched.length ? ` Skipped (not in Caspeco): ${queued.unmatched.join(", ")}.` : ""}
        </p>
        <a className="bookmark" href={bookmarklet}>
          Send queued week
        </a>
        <p>This app does not change Caspeco by itself. Drag that button onto your bookmarks bar, and only click it when the week is finished. Drafts stay unpublished.</p>
      </aside>
    </>
  );
}
