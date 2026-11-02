import type { LabourSettings } from "./labour";
import { DEFAULT_LABOUR } from "./labour";
import { isShopCode, isStaffGroup, type ShopCode, type StaffGroup } from "./shops";

export type EmployeeImport = {
  name: string;
  caspecoId?: string;
  group?: StaffGroup;
  shop?: ShopCode | "UNASSIGNED";
  alsoShop?: ShopCode | null;
  salary?: boolean;
  hourlyRate?: number | null;
};

export function parseEmployeesFile(json: unknown): EmployeeImport[] {
  if (Array.isArray(json)) return json.flatMap((row) => optionalEmployee(parseEmployeeRecord(row)));
  if (!json || typeof json !== "object") return [];
  const record = json as Record<string, unknown>;
  if (Array.isArray(record.employees)) {
    return record.employees.flatMap((row) => optionalEmployee(parseEmployeeRecord(row)));
  }
  const out: EmployeeImport[] = [];
  Object.entries(record).forEach(([name, value]) => {
    if (name === "settings" || value == null || typeof value === "object") return;
    out.push({ name, caspecoId: String(value) });
  });
  return out;
}

function optionalEmployee(row: EmployeeImport | null): EmployeeImport[] {
  return row ? [row] : [];
}

function parseEmployeeRecord(raw: unknown): EmployeeImport | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name || "").trim();
  if (!name) return null;
  const group = typeof row.group === "string" && isStaffGroup(row.group) ? row.group : undefined;
  const shopRaw = typeof row.shop === "string" ? row.shop : typeof row.homeShop === "string" ? row.homeShop : "";
  const shop = shopRaw === "UNASSIGNED" ? "UNASSIGNED" : isShopCode(shopRaw) ? shopRaw : undefined;
  const also = typeof row.alsoShop === "string" && isShopCode(row.alsoShop) ? row.alsoShop : null;
  const hourly = row.hourlyRate == null || row.hourlyRate === "" ? undefined : Number(row.hourlyRate);
  return {
    name,
    caspecoId: row.caspecoId != null ? String(row.caspecoId) : row.caspecoEmployeeId != null ? String(row.caspecoEmployeeId) : undefined,
    group,
    shop,
    alsoShop: also,
    salary: typeof row.salary === "boolean" ? row.salary : undefined,
    hourlyRate: hourly != null && Number.isFinite(hourly) ? hourly : undefined,
  };
}

export type RatesImport = {
  settings: Partial<LabourSettings> & { yearlyTargetPct?: number };
  hourly: Record<string, number>;
  salary: string[];
};

export function parseRatesFile(json: unknown): RatesImport {
  const settings: RatesImport["settings"] = {};
  const hourly: Record<string, number> = {};
  const salary: string[] = [];
  if (!json || typeof json !== "object") return { settings, hourly, salary };
  const row = json as Record<string, unknown>;
  (["fohAvg", "kitchenAvg", "bakeryAvg", "targetFohPct", "semesterPct", "agaPct", "yearlyTargetPct"] as const).forEach((key) => {
    if (row[key] != null && row[key] !== "") {
      const n = Number(row[key]);
      if (Number.isFinite(n)) settings[key] = n;
    }
  });
  if (settings.agaPct == null && row.onCostPct != null && row.onCostPct !== "") {
    const n = Number(row.onCostPct);
    if (Number.isFinite(n)) settings.agaPct = n;
  }
  if (row.hourly && typeof row.hourly === "object") {
    Object.entries(row.hourly as Record<string, unknown>).forEach(([name, value]) => {
      const n = Number(value);
      if (Number.isFinite(n) && n > 0) hourly[name] = Math.round(n);
    });
  }
  if (Array.isArray(row.salary)) {
    row.salary.forEach((name) => {
      if (typeof name === "string" && name.trim()) salary.push(name.trim());
    });
  }
  return { settings, hourly, salary };
}

export function mergeLabour(base: LabourSettings, patch: Partial<LabourSettings>): LabourSettings {
  return { ...base, ...Object.fromEntries(Object.entries(patch).filter(([, value]) => value != null)) } as LabourSettings;
}

export { DEFAULT_LABOUR };
