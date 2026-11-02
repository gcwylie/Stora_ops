import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type SessionUser = {
  uid: string;
  email: string;
  name: string;
  role: "ADMIN" | "MANAGER";
  shopCode: string;
};

const COOKIE = "stora_session";

function secret() {
  const value = process.env.AUTH_SECRET || "dev-only-secret-change-me";
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function readToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.role !== "ADMIN" && payload.role !== "MANAGER") return null;
    if (typeof payload.uid !== "string" || typeof payload.email !== "string") return null;
    return {
      uid: payload.uid,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : "",
      role: payload.role,
      shopCode: typeof payload.shopCode === "string" ? payload.shopCode : "",
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return readToken(token);
}

export async function setSessionCookie(token: string) {
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_URL || "").startsWith("https://"),
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export { COOKIE as SESSION_COOKIE };
