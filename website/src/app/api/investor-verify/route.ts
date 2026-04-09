import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const expected = process.env.INVESTOR_PAGE_PASSWORD;

  if (!expected) {
    return NextResponse.json({ error: "Investor access is not configured" }, { status: 503 });
  }

  if (!body || body.code !== expected) {
    return NextResponse.json({ error: "Invalid code" }, { status: 401 });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("pharmaconnect_investor_access", "granted", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24,
    path: "/",
  });
  return response;
}
