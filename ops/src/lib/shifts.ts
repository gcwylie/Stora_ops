import type { ShopCode, StaffGroup } from "./shops";

export type ShiftTemplate = {
  id: string;
  label: string;
  start: string;
  end: string;
  group: StaffGroup;
};

function shift(id: string, name: string, start: string, end: string, group: StaffGroup): ShiftTemplate {
  return { id, label: `${name} · ${start}–${end}`, start, end, group };
}

export const BAKERY_SHIFTS: ShiftTemplate[] = [
  shift("avbak", "Avbak", "03:00", "11:30", "Bakery"),
  shift("bakers", "Bakers", "05:20", "13:50", "Bakery"),
  shift("bord-early", "Bordspasset", "06:30", "15:00", "Bakery"),
  shift("bord-late", "Bordspasset", "08:00", "16:30", "Bakery"),
  shift("avbak-helg", "Avbak (Helg)", "05:00", "14:00", "Bakery"),
  shift("helg", "Helg", "06:00", "14:30", "Bakery"),
];

export const KITCHEN_SHIFTS: ShiftTemplate[] = [
  shift("kit-am-early", "Kitchen AM", "06:30", "14:30", "Kitchen"),
  shift("kit-am", "Kitchen AM", "07:00", "15:30", "Kitchen"),
  shift("kit-prep", "Kitchen Prep", "07:00", "15:30", "Kitchen"),
  shift("kit-am-sat", "Kitchen AM", "06:30", "15:30", "Kitchen"),
  shift("kit-pm", "Kitchen PM", "09:00", "17:30", "Kitchen"),
];

export const FOH_SHIFTS: ShiftTemplate[] = [
  shift("foh-open", "FOH Open", "07:00", "14:00", "FOH"),
  shift("foh-pm", "FOH PM", "09:00", "18:30", "FOH"),
  shift("pm-runner", "PM Runner", "08:00", "17:00", "FOH"),
  shift("pm-runner-late", "PM Runner", "11:00", "17:00", "FOH"),
  shift("pm-close", "PM Runner Close", "11:00", "18:30", "FOH"),
  shift("runner-am", "AM Runner", "07:30", "15:00", "FOH"),
];

export const ADMIN_SHIFTS: ShiftTemplate[] = [
  shift("admin", "ADMIN", "09:00", "17:00", "Admin"),
  shift("bord-late", "Bordspasset", "08:00", "16:30", "Admin"),
];

/** St Eriksgatan floor shifts. The local planner called this list `erik` / FOH Vasastan. */
export const SE88_SHIFTS: ShiftTemplate[] = [
  shift("open", "FOH Open", "06:30", "14:30", "FOH"),
  shift("open-short", "Open short", "07:00", "13:00", "FOH"),
  shift("mid", "FOH MID", "07:30", "16:00", "FOH"),
  shift("mid-weekend", "FOH MID WEEKEND", "08:00", "16:30", "FOH"),
  shift("close", "FOH CLOSE", "09:00", "17:30", "FOH"),
  shift("close-late", "FOH CLOSE", "10:00", "17:30", "FOH"),
  shift("close-short", "Close Short", "12:00", "17:30", "FOH"),
  shift("open-weekend", "FOH OPEN WEEKEND", "08:00", "16:00", "FOH"),
];

export const FOH_PASS_ORDER = ["foh-open", "foh-pm", "pm-runner", "pm-runner-late", "pm-close", "runner-am"];

export const FOH_SHIFT_MIGRATE: Record<string, string> = {
  "foh-am": "foh-open",
  "foh-mid": "runner-am",
  "mid-weekend": "runner-am",
  "foh-close": "foh-pm",
  "foh-close-wknd": "foh-pm",
};

const BY_GROUP: Record<StaffGroup, ShiftTemplate[]> = {
  Bakery: BAKERY_SHIFTS,
  Kitchen: KITCHEN_SHIFTS,
  FOH: FOH_SHIFTS,
  Admin: ADMIN_SHIFTS,
};

export function shiftsFor(shop: ShopCode, group: string): ShiftTemplate[] {
  if (shop === "SE88") return SE88_SHIFTS;
  if (group === "Bakery" || group === "Kitchen" || group === "FOH" || group === "Admin") return BY_GROUP[group];
  return FOH_SHIFTS;
}

export function shiftById(shop: ShopCode, group: string, id: string): ShiftTemplate | undefined {
  return shiftsFor(shop, group).find((item) => item.id === id);
}

export function shiftName(label: string): string {
  return label.split(" · ")[0];
}

/** On St Eriksgatan everyone uses the FOH shift list, matching the old vasastan board. */
export function effectiveGroup(shop: ShopCode, group: string): StaffGroup {
  if (shop === "SE88") return "FOH";
  if (group === "Bakery" || group === "Kitchen" || group === "FOH" || group === "Admin") return group;
  return "FOH";
}

export function toneFor(shop: ShopCode, group: string): string {
  if (shop === "SE88") return "erik";
  if (group === "Bakery") return "bakery";
  if (group === "Kitchen") return "kitchen";
  if (group === "Admin") return "admin";
  return "foh";
}

export function orderedShifts(list: ShiftTemplate[], prefer?: string[]): ShiftTemplate[] {
  if (!prefer) return list;
  const preferred = prefer.map((id) => list.find((shift) => shift.id === id)).filter((item): item is ShiftTemplate => Boolean(item));
  return [...preferred, ...list.filter((shift) => !prefer.includes(shift.id))];
}

export type PassBlock = { group: StaffGroup; tone: string; shifts: ShiftTemplate[] };

export function passCatalog(shop: ShopCode): PassBlock[] {
  if (shop === "SE88") {
    return [{ group: "FOH", tone: "erik", shifts: orderedShifts(SE88_SHIFTS) }];
  }
  return [
    { group: "Bakery", tone: "bakery", shifts: orderedShifts(BAKERY_SHIFTS) },
    { group: "Kitchen", tone: "kitchen", shifts: orderedShifts(KITCHEN_SHIFTS) },
    { group: "FOH", tone: "foh", shifts: orderedShifts(FOH_SHIFTS, FOH_PASS_ORDER) },
    { group: "Admin", tone: "admin", shifts: orderedShifts(ADMIN_SHIFTS) },
  ];
}

/** Caspeco station ids from the local planner. */
export const CASPECO_STATIONS: Record<ShopCode, Record<string, number>> = {
  SIB2: { Bakery: 6, Kitchen: 4, FOH: 5, Admin: 9 },
  SE88: { FOH: 13 },
};

export const CASPECO_SITE_STATIONS: Record<ShopCode, number[]> = {
  SE88: [11, 12, 13, 14, 16, 17],
  SIB2: [3, 4, 5, 6, 8, 9],
};

export function stockholmToUtcIso(dateStr: string, hm: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = hm.split(":").map(Number);
  const wanted = Date.UTC(year, month - 1, day, hour, minute);
  let guess = wanted;
  for (let i = 0; i < 4; i += 1) {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(guess));
    const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    const got = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"));
    guess += wanted - got;
  }
  return new Date(guess).toISOString().replace(".000Z", "Z");
}
