// WhatsApp Business API alert service
// Provider: Meta Cloud API via graph.facebook.com
// Required env vars:
//   WHATSAPP_PHONE_NUMBER_ID  — the numeric Phone Number ID from Meta Business Suite
//   WHATSAPP_ACCESS_TOKEN     — permanent system user token (not a temporary user token)
//   WHATSAPP_API_VERSION      — e.g. "v19.0" (default shown below)
//
// To activate:
//   1. Create a Meta App (Business type) at developers.facebook.com
//   2. Add WhatsApp product, register a phone number, get Phone Number ID
//   3. Create a System User under Business Settings → Users → System Users
//   4. Grant the system user full control of the WhatsApp asset
//   5. Generate a permanent token for the system user
//   6. Set env vars and switch WHATSAPP_PHONE_NUMBER_ID to production
//
// For development/testing: use the test number provided in the Meta App dashboard
// (free 1000 messages/month to verified test numbers)

const BASE_URL = 'https://graph.facebook.com';
const API_VERSION = process.env.WHATSAPP_API_VERSION ?? 'v19.0';

export function isWhatsAppConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN);
}

type TextMessage = {
  to: string;  // international format e.g. "255764000000"
  text: string;
};

async function sendTextMessage({ to, text }: TextMessage): Promise<void> {
  if (!isWhatsAppConfigured()) {
    console.warn('[whatsapp] Not configured — skipping message to', to);
    return;
  }

  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
  const token = process.env.WHATSAPP_ACCESS_TOKEN!;

  const response = await fetch(
    `${BASE_URL}/${API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      }),
    },
  );

  if (!response.ok) {
    const body = await response.text();
    throw Object.assign(
      new Error(`WhatsApp API error ${response.status}: ${body}`),
      { status: 502 },
    );
  }
}

// ─── Alert functions ──────────────────────────────────────────────────────────

export async function sendWhatsAppLowStockAlert(
  phone: string,
  pharmacyName: string,
  products: string[],
): Promise<void> {
  const list = products.slice(0, 5).join(', ') + (products.length > 5 ? ` (+${products.length - 5} more)` : '');
  await sendTextMessage({
    to: phone.replace(/\D/g, ''),
    text: `*APOTEKH — Low Stock Alert*\n\n📦 *${pharmacyName}*\n\nItems needing reorder:\n${list}\n\nLog in to APOTEKH to place a purchase order.`,
  });
}

export async function sendWhatsAppExpiryAlert(
  phone: string,
  pharmacyName: string,
  products: string[],
): Promise<void> {
  const list = products.slice(0, 5).join(', ') + (products.length > 5 ? ` (+${products.length - 5} more)` : '');
  await sendTextMessage({
    to: phone.replace(/\D/g, ''),
    text: `*APOTEKH — Expiry Alert*\n\n⚠️ *${pharmacyName}*\n\nNear-expiry items:\n${list}\n\nCheck your inventory and apply FEFO dispensing.`,
  });
}

export async function sendWhatsAppOrderStatus(
  phone: string,
  orderNumber: string,
  status: string,
  sellerName: string,
): Promise<void> {
  const statusEmoji: Record<string, string> = {
    CONFIRMED: '✅',
    PACKED: '📦',
    DISPATCHED: '🚚',
    DELIVERED: '✔️',
    CANCELLED: '❌',
  };
  const emoji = statusEmoji[status] ?? '📋';
  await sendTextMessage({
    to: phone.replace(/\D/g, ''),
    text: `*APOTEKH — Order Update*\n\n${emoji} Order *${orderNumber}* from *${sellerName}* is now *${status}*.\n\nLog in to APOTEKH to view details.`,
  });
}

export async function sendWhatsAppTrialExpiryWarning(
  phone: string,
  pharmacyName: string,
  daysLeft: number,
): Promise<void> {
  await sendTextMessage({
    to: phone.replace(/\D/g, ''),
    text: `*APOTEKH — Trial Ending Soon*\n\n⏰ *${pharmacyName}*\n\nYour free trial ends in *${daysLeft} day${daysLeft !== 1 ? 's' : ''}*.\n\nSubscribe now to keep access to your inventory and dispensing history: app.apotekh.co.tz/settings/subscription`,
  });
}
