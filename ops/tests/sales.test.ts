import { describe, expect, it } from "vitest";
import { parseEmployeesFile, parseRatesFile } from "../src/lib/import-parse";
import { buildSalesSnapshot, krToOre, parseKr, parseSalesFile, ytd } from "../src/lib/sales-math";

describe("sales file import", () => {
  it("maps Östermalm and St Eriksgatan and ignores Gast", () => {
    const parsed = parseSalesFile({
      settings: { yearlyTargetPct: 10 },
      days: {
        "2026-11-02": {
          ostermalm: 2500000,
          vasastan: 1800000,
          ostermalm_incl: 2800000,
          vasastan_incl: 2016000,
          rad57: 999,
        },
      },
      periods: [
        {
          from: "2023-01-01",
          to: "2023-01-31",
          ostermalm: 40000000,
          vasastan: 30000000,
          ostermalm_incl: 44800000,
          vasastan_incl: 33600000,
        },
      ],
    });
    expect(parsed.days["2026-11-02"].SIB2).toEqual({ excl: 2500000, incl: 2800000 });
    expect(parsed.days["2026-11-02"].SE88).toEqual({ excl: 1800000, incl: 2016000 });
    expect(parsed.days["2026-11-02"].SIB2 && Object.keys(parsed.days["2026-11-02"])).toEqual(["SIB2", "SE88"]);
    expect(parsed.periods).toHaveLength(2);
    expect(parsed.yearlyTargetPct).toBe(10);
    expect(ytd(parsed.days, parsed.periods, "2026-11-02", "both", "excl")).toBe(4300000);
  });
});

describe("sales tracking", () => {
  const days = {
    "2025-11-01": { SIB2: { excl: krToOre(1000), incl: krToOre(1120) }, SE88: { excl: krToOre(800), incl: krToOre(896) } },
    "2025-11-02": { SIB2: { excl: krToOre(2000), incl: krToOre(2240) }, SE88: { excl: krToOre(1500), incl: krToOre(1680) } },
    "2026-11-01": { SIB2: { excl: krToOre(1100), incl: krToOre(1232) }, SE88: { excl: krToOre(900), incl: krToOre(1008) } },
    "2026-11-02": { SIB2: { excl: krToOre(2200), incl: krToOre(2464) }, SE88: { excl: krToOre(1600), incl: krToOre(1792) } },
  };
  const periods = [
    { from: "2025-01-01", to: "2025-01-31", shop: "SIB2" as const, excl: krToOre(10000), incl: krToOre(11200) },
    { from: "2025-01-01", to: "2025-01-31", shop: "SE88" as const, excl: krToOre(8000), incl: krToOre(8960) },
  ];

  it("compares the year to date and the remaining pace", () => {
    const snap = buildSalesSnapshot({
      days,
      periods,
      costs: { "2026-10": { SIB2: 5000, SE88: 4000 } },
      today: "2026-11-03",
      shop: "both",
      vat: "excl",
      targetPct: 10,
    });
    expect(snap.through).toBe("2026-11-02");
    expect(snap.ytdOre).toBe(krToOre(1100 + 900 + 2200 + 1600));
    expect(snap.lastYtdOre).toBe(krToOre(1000 + 800 + 2000 + 1500 + 10000 + 8000));
    const lastFull = krToOre(10000 + 8000 + 1000 + 800 + 2000 + 1500);
    expect(snap.yearTargetOre).toBeCloseTo(lastFull * 1.1, 4);
    expect(snap.ytdPct).toBeCloseTo(((snap.ytdOre - snap.lastYtdOre) / snap.lastYtdOre) * 100, 6);
    expect(snap.remaining[0].iso).toBe("2026-11-03");
    expect(snap.paceOre).toBeGreaterThan(0);
  });

  it("keeps wage % on sales excluding VAT", () => {
    const snap = buildSalesSnapshot({
      days,
      periods,
      costs: {
        "2025-11": { both: 0, SIB2: 300, SE88: 200 },
        "2026-10": { SIB2: 1000 },
      },
      today: "2026-11-03",
      shop: "SIB2",
      vat: "incl",
      targetPct: 10,
    });
    expect(snap.ytdOre).toBe(krToOre(1232 + 2464));
    const november = snap.wageMonths[10];
    expect(november.thisSalesOre).toBe(krToOre(1100 + 2200));
    expect(november.priorCostKr).toBe(300);
    expect(november.priorPct).toBeCloseTo((300 / (1000 + 2000)) * 100, 6);
  });
});

describe("kr parsing and staff files", () => {
  it("parses Swedish kronor", () => {
    expect(parseKr("12 500 kr")).toBe(12500);
    expect(parseKr("1.250,50")).toBe(1251);
    expect(parseKr("")).toBe(0);
  });

  it("reads the Caspeco id map and the rates file", () => {
    expect(parseEmployeesFile({ "Nora Lind": 1001, "Sam Ek": "1002" })).toEqual([
      { name: "Nora Lind", caspecoId: "1001" },
      { name: "Sam Ek", caspecoId: "1002" },
    ]);
    const rates = parseRatesFile({
      onCostPct: 31.42,
      fohAvg: 153,
      hourly: { "Sam Ek": 165 },
      salary: ["Nora Lind"],
    });
    expect(rates.settings.agaPct).toBe(31.42);
    expect(rates.settings.fohAvg).toBe(153);
    expect(rates.hourly["Sam Ek"]).toBe(165);
    expect(rates.salary).toEqual(["Nora Lind"]);
  });
});
