import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

function cors(response: NextResponse) {
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export function OPTIONS() {
  return cors(new NextResponse(null, { status: 204 }));
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") || "";
  const expected = process.env.CASPECO_TOKEN || "";
  if (expected && token !== expected) {
    return cors(NextResponse.json({ error: "Bad token" }, { status: 401 }));
  }
  const row = await prisma.caspecoQueue.findFirst({ orderBy: { createdAt: "desc" } });
  return cors(NextResponse.json(row?.payload ?? {}));
}
