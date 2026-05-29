import { mkdir, appendFile } from "fs/promises";
import { join } from "path";

type Submission = Record<string, unknown>;

const dir = join("/tmp", "pharmaconnect-website");

export async function appendSubmission(kind: string, payload: Submission) {
  await mkdir(dir, { recursive: true });
  await appendFile(
    join(dir, `${kind}.jsonl`),
    `${JSON.stringify({ at: new Date().toISOString(), ...payload })}\n`,
    "utf8",
  );
}

export async function sendResendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || "support@apotekh.co.tz";

  if (!apiKey) {
    return { sent: false, reason: "not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true };
}

export function isEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isPhone(value: unknown): value is string {
  return typeof value === "string" && /^\+?255[0-9]{9}$/.test(value);
}

export function isNonEmptyString(value: unknown, min = 2): value is string {
  return typeof value === "string" && value.trim().length >= min;
}
