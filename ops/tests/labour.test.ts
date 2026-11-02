import { describe, expect, it } from "vitest";
import { lastYearSameWeekday, mondayOf, weekdayIndex } from "../src/lib/dates";
import {
  baseHourly,
  dayLabour,
  DEFAULT_LABOUR,
  fohNeeded,
  hoursFromTimes,
  loadFactor,
  loadedHourly,
  sumDays,
  wagePct,
  withinTarget,
} from "../src/lib/labour";
import { stockholmToUtcIso } from "../src/lib/shifts";

const settings = { ...DEFAULT_LABOUR };

describe("load factor and hourly cost", () => {
  it("applies 12% holiday pay and 31.42% employer social fees", () => {
    expect(loadFactor(settings)).toBeCloseTo(1.12 * 1.3142, 10);
  });

  it("loads a 153 kr FOH hour", () => {
    const loaded = loadedHourly({ group: "FOH" }, settings);
    expect(loaded).toBeCloseTo(153 * 1.12 * 1.3142, 8);
  });

  it("uses a typed rate before the department average", () => {
    expect(baseHourly({ group: "FOH", hourlyOverride: 165 }, settings)).toBe(165);
    expect(loadedHourly({ group: "Kitchen", hourlyOverride: 160 }, settings)).toBeCloseTo(160 * 1.12 * 1.3142, 8);
  });

  it("keeps salary staff at zero until a kr/h is typed", () => {
    expect(baseHourly({ group: "Bakery", salary: true }, settings)).toBe(0);
    expect(baseHourly({ group: "Admin", salary: true, hourlyOverride: 153 }, settings)).toBe(153);
  });

  it("uses the FOH average for admin when they are not salary", () => {
    expect(baseHourly({ group: "Admin" }, settings)).toBe(153);
    expect(baseHourly({ group: "Bakery" }, { ...settings, bakeryAvg: 0 })).toBe(0);
  });
});

describe("hours", () => {
  it("counts named shifts", () => {
    expect(hoursFromTimes("07:00", "14:00")).toBe(7);
    expect(hoursFromTimes("03:00", "11:30")).toBe(8.5);
    expect(hoursFromTimes("05:20", "13:50")).toBe(8.5);
    expect(hoursFromTimes("09:00", "18:30")).toBe(9.5);
  });

  it("wraps past midnight", () => {
    expect(hoursFromTimes("22:00", "02:00")).toBe(4);
  });
});

describe("labour percent", () => {
  const yearTarget = 10;
  const people = [
    { group: "FOH", hours: 7 },
    { group: "Kitchen", hours: 8 },
    { group: "Bakery", hours: 8.5, salary: true },
    { group: "Admin", hours: 8, salary: true },
  ];

  it("puts bakery and admin outside the labour percentage", () => {
    const day = dayLabour(people, { thisKr: 10000, lastKr: 8000 }, settings, yearTarget);
    const factor = 1.12 * 1.3142;
    const foh = 7 * 153 * factor;
    const kitchen = 8 * 153 * factor;
    expect(day.fohCost).toBeCloseTo(foh, 6);
    expect(day.kitCost).toBeCloseTo(kitchen, 6);
    expect(day.bakeCost).toBe(0);
    expect(day.adminCost).toBe(0);
    expect(day.shopCost).toBeCloseTo(foh + kitchen, 6);
    expect(day.shopCost / day.sales.used).toBeCloseTo((foh + kitchen) / 10000, 8);
    expect(day.sales.used).toBe(10000);
    expect(day.sales.lastYear).toBe(false);
  });

  it("targets FOH hours from last year sales, the yearly target, and loaded FOH kr/h", () => {
    const day = dayLabour(people, { thisKr: 10000, lastKr: 8000 }, settings, yearTarget);
    const factor = 1.12 * 1.3142;
    const targetSales = 8000 * 1.1;
    const targetHours = (targetSales * 0.21) / (153 * factor);
    expect(day.targetSales).toBeCloseTo(targetSales, 6);
    expect(day.targetHours).toBeCloseTo(targetHours, 8);
  });

  it("falls back to last year sales when this year is empty", () => {
    const day = dayLabour([{ group: "FOH", hours: 7 }], { thisKr: 0, lastKr: 5000 }, settings, yearTarget);
    expect(day.sales.used).toBe(5000);
    expect(day.sales.lastYear).toBe(true);
    expect(day.shopCost / day.sales.used).toBeCloseTo(day.shopCost / 5000, 8);
  });

  it("flags labour over the 21% target, with the planner's one-point tolerance", () => {
    const over = dayLabour([{ group: "FOH", hours: 40 }], { thisKr: 10000, lastKr: 10000 }, settings, yearTarget);
    const under = dayLabour([{ group: "FOH", hours: 7 }], { thisKr: 20000, lastKr: 20000 }, settings, yearTarget);
    expect(withinTarget(over.shopCost, over.sales.used, 21)).toBe(false);
    expect(withinTarget(under.shopCost, under.sales.used, 21)).toBe(true);
    expect(withinTarget(0, 0, 21)).toBeNull();
  });

  it("sums a week the same way as the labour sheet total", () => {
    const day = dayLabour(people, { thisKr: 10000, lastKr: 8000 }, settings, yearTarget);
    const week = sumDays([day, day]);
    expect(week.shopCost).toBeCloseTo(day.shopCost * 2, 6);
    expect(week.used).toBe(20000);
    expect(week.labourPct).toBeCloseTo(week.shopCost / 20000, 8);
    expect(week.hours.bakery).toBe(17);
    expect(week.bakeCost).toBe(0);
  });
});

describe("book wage percent", () => {
  it("divides staff cost in kronor by sales excluding VAT", () => {
    expect(wagePct(20000, 10000000)).toBeCloseTo(20, 8);
    expect(wagePct(0, 1000)).toBeNull();
    expect(wagePct(100, 0)).toBeNull();
  });
});

describe("FOH coverage", () => {
  it("asks for 7 on Mon–Thu and 9 on Fri–Sun", () => {
    const monday = fohNeeded(0);
    const friday = fohNeeded(4);
    const mondayTotal = Object.values(monday).reduce((sum, n) => sum + n, 0);
    const fridayTotal = Object.values(friday).reduce((sum, n) => sum + n, 0);
    expect(mondayTotal).toBe(7);
    expect(fridayTotal).toBe(9);
    expect(friday.pm).toBe(3);
    expect(monday.pmClose).toBe(2);
  });
});

describe("dates and Caspeco clocks", () => {
  it("maps a Monday onto the same weekday last ISO week", () => {
    expect(lastYearSameWeekday("2024-01-01")).toBe("2023-01-02");
    expect(weekdayIndex(lastYearSameWeekday("2026-11-02"))).toBe(weekdayIndex("2026-11-02"));
    expect(mondayOf("2026-11-02")).toBe("2026-11-02");
    expect(mondayOf("2026-11-04")).toBe("2026-11-02");
  });

  it("converts Stockholm wall time to UTC for Caspeco", () => {
    expect(stockholmToUtcIso("2026-11-02", "07:00")).toBe("2026-11-02T06:00:00Z");
    expect(stockholmToUtcIso("2026-07-01", "07:00")).toBe("2026-07-01T05:00:00Z");
  });
});
