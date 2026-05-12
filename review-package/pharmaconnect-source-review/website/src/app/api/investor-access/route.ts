import { NextResponse } from "next/server";
import {
  appendSubmission,
  isEmail,
  isNonEmptyString,
  sendResendEmail,
} from "@/lib/server/submissions";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body || !isNonEmptyString(body.name, 3) || !isEmail(body.email)) {
    return NextResponse.json({ error: "Invalid investor access payload" }, { status: 400 });
  }

  const password = process.env.INVESTOR_PAGE_PASSWORD;

  await appendSubmission("investor-access", {
    name: body.name,
    email: body.email,
  });

  if (!password) {
    return NextResponse.json(
      { error: "Investor access is temporarily unavailable" },
      { status: 503 },
    );
  }

  await sendResendEmail({
    to: body.email,
    subject: "Your PharmaConnect investor access code",
    html: `<p>Hello ${body.name},</p><p>Your PharmaConnect investor access code is: <strong>${password}</strong></p>`,
  });

  return NextResponse.json({ sent: true });
}
