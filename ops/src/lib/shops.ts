export const SHOP_CODES = ["SE88", "SIB2"] as const;
export type ShopCode = (typeof SHOP_CODES)[number];
export type ShopView = ShopCode | "both";

export type Shop = {
  code: ShopCode;
  name: string;
  address: string;
  short: string;
};

export const SHOPS: readonly Shop[] = [
  {
    code: "SE88",
    name: "St Eriksgatan",
    address: "Sankt Eriksgatan 88",
    short: "St Erik",
  },
  {
    code: "SIB2",
    name: "Östermalm",
    address: "Sibyllegatan 2",
    short: "Östermalm",
  },
];

export function shopByCode(code: string): Shop | undefined {
  return SHOPS.find((shop) => shop.code === code);
}

export function isShopCode(value: string | null | undefined): value is ShopCode {
  return value === "SE88" || value === "SIB2";
}

/** Keys used by the local planner and sales-days.json. Gast Café / RAD57 is ignored. */
export const LEGACY_SHOP_KEYS: Record<string, ShopCode> = {
  ostermalm: "SIB2",
  vasastan: "SE88",
  se88: "SE88",
  sib2: "SIB2",
  SE88: "SE88",
  SIB2: "SIB2",
};

export function shopFromLegacy(key: string): ShopCode | null {
  return LEGACY_SHOP_KEYS[key] ?? LEGACY_SHOP_KEYS[key.toLowerCase()] ?? null;
}

export const GROUPS = ["Bakery", "Kitchen", "FOH", "Admin"] as const;
export type StaffGroup = (typeof GROUPS)[number];

export function isStaffGroup(value: string): value is StaffGroup {
  return (GROUPS as readonly string[]).includes(value);
}
