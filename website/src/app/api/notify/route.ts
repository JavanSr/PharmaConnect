import { NextResponse } from "next/server";
import { appendSubmission, isEmail } from "@/lib/server/submissions";

const allowedFutureGroups = new Set([2, 3, 4]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const phase = Number(body?.phase);

  if (!body || !isEmail(body.email) || !allowedFutureGroups.has(phase)) {
    return NextResponse.json({ error: "Invalid notification payload" }, { status: 400 });
  }

  await appendSubmission("notify", {
    email: body.email,
    phase,
  });

  return NextResponse.json({ success: true });
}
