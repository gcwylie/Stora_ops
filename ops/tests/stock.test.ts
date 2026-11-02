import { describe, expect, it } from "vitest";
import {
  baseTotal,
  countTotals,
  DEFAULT_RULES,
  isLowStock,
  looseInPrimary,
  parseCatalogue,
  primaryUnits,
  suggestedOrderQty,
  tooMuch,
  usageBetween,
  valueOf,
  type StockItem,
} from "../src/lib/stock-math";

const milk: StockItem = {
  n: 1,
  category: "2. Dairy & cheese",
  name: "Milk",
  supplier: "Arla",
  sites: ["SE88", "SIB2"],
  orderUnit: "L",
  primaryUnit: "L",
  primaryToBase: 1,
  baseUnit: "L",
  perPiece: null,
  priceSek: 12,
  note: "",
  alts: [
    { u: "dl", f: 0.1 },
    { u: "ml", f: 0.001 },
  ],
};

const spinach: StockItem = {
  n: 2,
  category: "1. Fruit & vegetables",
  name: "Spinach",
  supplier: "Market",
  sites: ["SE88"],
  orderUnit: "bag (1 bag = 500 g)",
  primaryUnit: "bag",
  primaryToBase: 0.5,
  baseUnit: "kg",
  perPiece: null,
  priceSek: 40,
  note: "",
  alts: [
    { u: "kg", f: 2 },
    { u: "g", f: 0.002 },
  ],
};

const cases: StockItem = {
  n: 3,
  category: "1. Fruit & vegetables",
  name: "Lettuce",
  supplier: "Market",
  sites: ["SIB2"],
  orderUnit: "case (1 case = 12 pcs)",
  primaryUnit: "case",
  primaryToBase: null,
  baseUnit: null,
  perPiece: 12,
  priceSek: 240,
  note: "",
  alts: [{ u: "pcs", f: 1 / 12 }],
};

const shirt: StockItem = {
  n: 4,
  category: "10. Merchandise",
  name: "T-shirt",
  supplier: "Print",
  sites: ["SIB2"],
  orderUnit: "pcs",
  primaryUnit: "pcs",
  primaryToBase: null,
  baseUnit: null,
  perPiece: null,
  priceSek: 5000,
  note: "",
  alts: [],
};

describe("unit conversion and value", () => {
  it("converts a loose second count into ordering units", () => {
    const line = { q: 3, a: 200, u: "g" };
    expect(looseInPrimary(spinach, line)).toBeCloseTo(0.4, 8);
    expect(primaryUnits(spinach, line)).toBeCloseTo(3.4, 8);
    expect(valueOf(spinach, line)).toBeCloseTo(136, 8);
    expect(baseTotal(spinach, line)).toEqual({ v: 1.7, u: "kg" });
  });

  it("converts loose pieces into a fraction of a case", () => {
    const line = { q: 1, a: 3, u: "pcs" };
    expect(primaryUnits(cases, line)).toBeCloseTo(1.25, 6);
    expect(valueOf(cases, line)).toBeCloseTo(300, 6);
    expect(baseTotal(cases, line)?.v).toBeCloseTo(15, 6);
    expect(baseTotal(cases, line)?.u).toBe("pcs");
  });

  it("treats an explicit zero as counted and a blank as not", () => {
    expect(valueOf(milk, { q: 0, a: null, u: null })).toBe(0);
    expect(countTotals([milk], { 1: { q: 0, a: null, u: null } }).done).toBe(1);
    expect(countTotals([milk], {}).done).toBe(0);
  });

  it("sums value by category and supplier", () => {
    const totals = countTotals([milk, spinach], {
      1: { q: 10, a: null, u: null },
      2: { q: 2, a: null, u: null },
    });
    expect(totals.sum).toBeCloseTo(10 * 12 + 80, 6);
    expect(totals.byCat["2. Dairy & cheese"]).toBeCloseTo(120, 6);
    expect(totals.bySup.Market).toBeCloseTo(80, 6);
    expect(totals.done).toBe(2);
  });
});

describe("sanity limits", () => {
  it("flags a quantity over the category limit", () => {
    const flag = tooMuch(milk, { q: 80, a: null, u: null }, DEFAULT_RULES);
    expect(flag?.kind).toBe("amount");
    expect(flag?.u).toBe("L");
    expect(flag?.max).toBe(60);
    expect(flag?.byValue).toBe(false);
  });

  it("lowers the bar when the line would exceed the value cap", () => {
    const flag = tooMuch(shirt, { q: 20, a: null, u: null }, DEFAULT_RULES);
    expect(flag?.kind).toBe("units");
    expect(flag?.byValue).toBe(true);
    expect(flag?.max).toBe(14);
  });

  it("does not flag a normal amount of an expensive item", () => {
    expect(tooMuch(shirt, { q: 4, a: null, u: null }, DEFAULT_RULES)).toBeNull();
  });
});

describe("usage, orders, and low stock", () => {
  it("suggests ordering what was used, and nothing when stock rose", () => {
    const used = usageBetween(spinach, { q: 10, a: null, u: null }, { q: 4, a: null, u: null });
    expect(used).toBe(6);
    expect(suggestedOrderQty(used)).toBe(6);
    const delivered = usageBetween(spinach, { q: 4, a: null, u: null }, { q: 10, a: null, u: null });
    expect(suggestedOrderQty(delivered)).toBe(0);
  });

  it("includes the loose count in usage", () => {
    const used = usageBetween(
      spinach,
      { q: 4, a: 100, u: "g" },
      { q: 3, a: 0, u: "g" },
    );
    expect(used).toBeCloseTo(1.2, 8);
    expect(suggestedOrderQty(used)).toBeCloseTo(1.2, 8);
  });

  it("marks zero and thin cover as low stock", () => {
    expect(isLowStock(milk, { q: 0, a: null, u: null })).toBe(true);
    expect(
      isLowStock(milk, { q: 2, a: null, u: null }, { q: 10, a: null, u: null }),
    ).toBe(true);
    expect(
      isLowStock(milk, { q: 8, a: null, u: null }, { q: 10, a: null, u: null }),
    ).toBe(false);
    expect(isLowStock(milk, null)).toBe(false);
  });
});

describe("catalogue import", () => {
  it("keeps the two bakeries and drops Gast Café", () => {
    const parsed = parseCatalogue({
      maxUnits: 100,
      valueCap: 20000,
      limits: { "6. Drinks & coffee": { kg: 30, L: 150, pcs: 600 } },
      items: [
        {
          n: 10,
          c: "6. Drinks & coffee",
          i: "Coffee",
          s: "Roaster",
          u: ["SE88", "RAD57"],
          p: "kg",
          pu: "kg",
          pv: 1,
          pb: "kg",
          pr: 180,
          alts: [],
        },
        {
          n: 11,
          c: "6. Drinks & coffee",
          i: "Gast only beans",
          s: "Roaster",
          u: ["RAD57"],
          p: "kg",
          pu: "kg",
          pv: 1,
          pb: "kg",
          pr: 90,
          alts: [],
        },
      ],
    });
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0].sites).toEqual(["SE88"]);
    expect(parsed.skipped).toBe(1);
    expect(parsed.rules.limits["6. Drinks & coffee"].L).toBe(150);
  });
});
