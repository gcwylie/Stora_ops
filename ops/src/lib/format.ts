export function formatKr(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  const sign = n < 0 ? "−" : "";
  const grouped = Math.abs(Math.round(n))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  return `${sign}${grouped}\u00a0kr`;
}

export function formatKrOre(ore: number | null | undefined): string {
  if (ore == null || !Number.isFinite(ore)) return "—";
  return formatKr(ore / 100);
}

export function formatPctRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(1)}%`;
}

export function formatPctPoints(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(1)}%`;
}

export function formatHours(n: number): string {
  if (!n) return "0";
  return n.toFixed(n % 1 ? 1 : 0);
}

export function formatSek(n: number): string {
  return `${Math.round(n).toLocaleString("sv-SE")} SEK`;
}

export function formatSek2(n: number): string {
  return n.toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
