/** Calendar dates as YYYY-MM-DD, arithmetic in UTC so the server timezone cannot shift a day. */

export function parseYmd(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function asUtcDate(iso: string): Date {
  return parseYmd(iso);
}

export function addDays(iso: string, n: number): string {
  const dt = parseYmd(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return formatYmd(dt);
}

export function weekdayIndex(iso: string): number {
  return (parseYmd(iso).getUTCDay() + 6) % 7;
}

export function mondayOf(iso: string): string {
  return addDays(iso, -weekdayIndex(iso));
}

export function stockholmToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function monthName(index: number): string {
  return MONTHS[index] || "";
}

export function dayLabel(iso: string): string {
  return `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

export function weekdayName(iso: string): string {
  return WEEKDAYS[weekdayIndex(iso)];
}

export function formatRange(monday: string): string {
  const start = parseYmd(monday);
  const end = parseYmd(addDays(monday, 6));
  const fmt = (d: Date) => `${d.getUTCDate()}/${d.getUTCMonth() + 1}`;
  return `${fmt(start)}–${fmt(end)}`;
}

export function dayHeader(monday: string, dayIndex: number): string {
  const iso = addDays(monday, dayIndex);
  return `${WEEKDAYS[dayIndex]} ${Number(iso.slice(8, 10))}/${Number(iso.slice(5, 7))}`;
}

export function isoWeekYear(iso: string): number {
  const thursday = addDays(mondayOf(iso), 3);
  return Number(thursday.slice(0, 4));
}

export function isoWeeksInYear(year: number): number {
  const jan1 = parseYmd(`${year}-01-01`).getUTCDay();
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52;
}

export function mondayOfIsoWeek(weekYear: number, week: number): string {
  const jan4 = `${weekYear}-01-04`;
  const week1 = mondayOf(jan4);
  return addDays(week1, (week - 1) * 7);
}

export function isoWeekNumber(iso: string): number {
  const weekYear = isoWeekYear(iso);
  const week1 = mondayOfIsoWeek(weekYear, 1);
  const diff = (parseYmd(mondayOf(iso)).getTime() - parseYmd(week1).getTime()) / 604800000;
  return 1 + Math.round(diff);
}

/** Same weekday of the same ISO week last year. Used by the labour sheet, not the sales calendar. */
export function lastYearSameWeekday(iso: string): string {
  const weekYear = isoWeekYear(iso);
  const prevYear = weekYear - 1;
  let week = isoWeekNumber(iso);
  const weeks = isoWeeksInYear(prevYear);
  if (week > weeks) week = weeks;
  const weekday = weekdayIndex(iso);
  return addDays(mondayOfIsoWeek(prevYear, week), weekday);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function eachDate(fromIso: string, toIso: string): string[] {
  const out: string[] = [];
  let cursor = fromIso;
  while (cursor <= toIso) {
    out.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return out;
}
