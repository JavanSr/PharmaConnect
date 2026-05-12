import { NextResponse } from "next/server";
import {
  appendSubmission,
  isEmail,
  isNonEmptyString,
  sendResendEmail,
} from "@/lib/server/submissions";

const allowedVariants = new Set(["investor", "partner"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    !allowedVariants.has(body.variant) ||
    !isNonEmptyString(body.name, 3) ||
    !isEmail(body.email) ||
    !isNonEmptyString(body.message, 10)
  ) {
    return NextResponse.json({ error: "Invalid contact payload" }, { status: 400 });
  }

  await appendSubmission("contact", {
    variant: body.variant,
    name: body.name,
    email: body.email,
    message: body.message,
  });

  const notify = process.env.RESEND_NOTIFY || "elihaki.yusuph@gmail.com";
  await sendResendEmail({
    to: notify,
    subject: `New APOTEKH ${body.variant} inquiry`,
    html: `<p>${body.name} submitted a ${body.variant} inquiry.</p><p>${body.email}</p><p>${body.message}</p>`,
  });
  await sendResendEmail({
    to: body.email,
    subject: "APOTEKH received your inquiry",
    html: `<p>Hello ${body.name},</p><p>Thank you for contacting APOTEKH. We received your ${body.variant} inquiry and will respond within 48 hours.</p>`,
  });

  return NextResponse.json({ success: true });
}
