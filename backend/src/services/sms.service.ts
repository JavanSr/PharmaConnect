import AfricasTalking from 'africastalking';

// ── Africa's Talking SMS Service ──────────────────────────────────────────────
// Config: AFRICAS_TALKING_USERNAME, AFRICAS_TALKING_API_KEY, AFRICAS_TALKING_SENDER_ID

function getConfig() {
  return {
    username: process.env.AFRICAS_TALKING_USERNAME ?? '',
    apiKey: process.env.AFRICAS_TALKING_API_KEY ?? '',
    senderId: process.env.AFRICAS_TALKING_SENDER_ID,
  };
}

export function isSmsConfigured(): boolean {
  const { username, apiKey } = getConfig();
  return Boolean(username && apiKey);
}

export async function sendSms(to: string | string[], message: string): Promise<void> {
  const { username, apiKey, senderId } = getConfig();

  if (!isSmsConfigured()) {
    const err = Object.assign(
      new Error('SMS service not configured: set AFRICAS_TALKING_USERNAME and AFRICAS_TALKING_API_KEY'),
      { status: 503 },
    );
    throw err;
  }

  try {
    const at = AfricasTalking({ username, apiKey });
    const sms = at.SMS;
    const recipients = Array.isArray(to) ? to : [to];
    await sms.send({ to: recipients, message, from: senderId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw Object.assign(new Error(`SMS delivery failed: ${msg}`), { status: 502 });
  }
}

export async function sendLowStockAlert(
  phone: string,
  pharmacyName: string,
  products: string[],
): Promise<void> {
  const message = `APOTEKH: Low stock alert for ${pharmacyName}. Reorder needed: ${products.join(', ')}. Log in to reorder.`;
  await sendSms(phone, message);
}

export async function sendExpiryAlert(
  phone: string,
  pharmacyName: string,
  products: string[],
): Promise<void> {
  const message = `APOTEKH: Expiry alert for ${pharmacyName}. Near-expiry items: ${products.join(', ')}. Check your inventory.`;
  await sendSms(phone, message);
}

export async function sendOrderStatusSms(
  phone: string,
  orderNumber: string,
  status: string,
  pharmacyName: string,
): Promise<void> {
  const message = `APOTEKH: Your order ${orderNumber} from ${pharmacyName} is now ${status}.`;
  await sendSms(phone, message);
}
