import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "./session";
import { isShopCode, SHOPS, type ShopCode, type ShopView } from "./shops";

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/login");
  return user;
}

export function allowedShops(user: SessionUser): ShopCode[] {
  if (user.role === "ADMIN") return ["SE88", "SIB2"];
  return isShopCode(user.shopCode) ? [user.shopCode] : [];
}

export function assertShop(user: SessionUser, shop: string): ShopCode {
  if (!isShopCode(shop) || !allowedShops(user).includes(shop)) {
    throw new Error("That shop is not on your login.");
  }
  return shop;
}

export async function resolveShop(user: SessionUser, requested?: string): Promise<ShopCode> {
  const allowed = allowedShops(user);
  const jar = await cookies();
  const pick = (value?: string | null) => (value && allowed.includes(value as ShopCode) ? (value as ShopCode) : null);
  const shop = pick(requested) || pick(jar.get("stora_shop")?.value) || allowed[0];
  if (!shop) redirect("/login");
  return shop;
}

export async function resolveView(user: SessionUser, requested?: string): Promise<ShopView> {
  if (user.role === "ADMIN" && (requested === "both" || requested == null || requested === "")) {
    if (requested === "both") return "both";
    return "both";
  }
  if (requested === "both" && user.role !== "ADMIN") return await resolveShop(user);
  if (requested && isShopCode(requested)) return assertShop(user, requested);
  if (user.role === "ADMIN") return "both";
  return resolveShop(user);
}

export function shopsForUser(user: SessionUser) {
  const allowed = new Set(allowedShops(user));
  return SHOPS.filter((shop) => allowed.has(shop.code));
}
