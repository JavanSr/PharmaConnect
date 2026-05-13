import { NextResponse } from "next/server";
import {
  appendSubmission,
  isNonEmptyString,
  isPhone,
  sendResendEmail,
} from "@/lib/server/submissions";

const allowedTypes = new Set(["ADDO", "Retail", "Wholesale"]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (
    !body ||
    !isNonEmptyString(body.pharmacyName, 3) ||
    !isNonEmptyString(body.ownerName, 3) ||
    !isPhone(body.phone) ||
    !allowedTypes.has(body.type)
  ) {
    return NextResponse.json({ error: "Invalid waitlist payload" }, { status: 400 });
  }

  await appendSubmission("waitlist", {
    pharmacyName: body.pharmacyName,
    ownerName: body.ownerName,
    phone: body.phone,
    type: body.type,
  });

  const notify = process.env.RESEND_NOTIFY || "elihaki.yusuph@gmail.com";
  await sendResendEmail({
    to: notify,
    subject: "New APOTEKH access request",
    html: `<p>${body.ownerName} requested APOTEKH access for ${body.pharmacyName}.</p><p>Phone: ${body.phone}</p><p>Type: ${body.type}</p>`,
  });

  return NextResponse.json({ success: true });
}
