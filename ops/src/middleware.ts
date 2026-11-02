import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "stora_session";

function secret() {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "dev-only-secret-change-me");
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    const login = new URL("/login", request.url);
    return NextResponse.redirect(login);
  }
  try {
    await jwtVerify(token, secret());
    return NextResponse.next();
  } catch {
    const login = new URL("/login", request.url);
    const response = NextResponse.redirect(login);
    response.cookies.delete(COOKIE);
    return response;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/caspeco|login).*)"],
};
