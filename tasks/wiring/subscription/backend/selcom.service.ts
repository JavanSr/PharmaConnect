// backend/src/modules/subscriptions/selcom.service.ts
//
// Selcom Payment Gateway integration for APOTEKH
// Docs: https://developers.selcom.net
//
// Required env vars:
//   SELCOM_VENDOR_ID   – your vendor/merchant ID from Selcom dashboard
//   SELCOM_API_KEY     – your API key
//   SELCOM_API_SECRET  – your API secret (used for HMAC-SHA256 signing)
//   SELCOM_BASE_URL    – https://apigw.selcom.net (production)
//                        https://apigwtest.selcom.net (sandbox)
//   APP_URL            – https://api.apotekh.co.tz (used to build callback URL)
//
// ─────────────────────────────────────────────────────────────────────────────

import crypto from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SelcomOrderRequest {
  /** Your internal order reference (e.g. subscription payment ID) */
  orderId: string;
  /** Amount in Tanzanian Shillings */
  amountTzs: number;
  /** Buyer's phone number in international format: 255XXXXXXXXX */
  buyerPhone: string;
  /** Human-readable product description */
  buyerName: string;
  /** Optional email for receipt */
  buyerEmail?: string;
  /** Narration shown to customer on USSD prompt */
  narration: string;
}

export interface SelcomOrderResponse {
  success: boolean;
  /** Selcom's reference — store this to correlate the webhook */
  selcomOrderId: string;
  /** URL to redirect user to complete payment (for web checkout) */
  paymentGatewayUrl?: string;
  /** Raw response for debugging */
  raw?: unknown;
}

export interface SelcomWebhookPayload {
  order_id:           string;   // your orderId
  transid:            string;   // Selcom transaction ID
  reference:          string;   // Selcom order reference
  result:             string;   // "SUCCESS" | "FAILED" | "PENDING"
  resultcode:         string;   // "000" = success
  amount:             string;
  channel:            string;   // "TIGOPESA" | "MPESA" etc.
  msisdn:             string;   // payer's phone
  message?:           string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build Selcom API auth headers.
 *
 * From the official docs:
 *   Authorization  : "SELCOM " + base64(api_key)
 *   Timestamp      : ISO 8601, e.g. "2024-06-01T09:30:46+03:00"
 *   Digest-Method  : "HS256"
 *   Signed-Fields  : comma-separated list of body field names whose values
 *                    were concatenated (in order) to produce the Digest
 *   Digest         : base64( HMAC-SHA256( concat(field_values), api_secret ) )
 *
 * The signature is computed over the VALUES of the listed fields, concatenated
 * in the same order as Signed-Fields — NOT over the raw JSON body string.
 */
function buildAuthHeaders(
  body: Record<string, unknown>,
  signedFieldNames: string[],
): Record<string, string> {
  const apiKey    = process.env.SELCOM_API_KEY!;
  const apiSecret = process.env.SELCOM_API_SECRET!;

  if (!apiKey || !apiSecret) {
    throw new Error('Selcom credentials not configured (SELCOM_API_KEY / SELCOM_API_SECRET)');
  }

  // ISO 8601 with EAT offset (+03:00)
  const timestamp = new Date().toLocaleString('sv-SE', { timeZone: 'Africa/Dar_es_Salaam' })
    .replace(' ', 'T') + '+03:00';                     // e.g. 2024-06-01T09:30:46+03:00

  // Concatenate the VALUES of the signed fields in order
  const signedValues = signedFieldNames
    .map((key) => String(body[key] ?? ''))
    .join('');

  const digest = crypto
    .createHmac('sha256', apiSecret)
    .update(signedValues)
    .digest('base64');

  return {
    'Content-Type':  'application/json',
    'Authorization': `SELCOM ${Buffer.from(apiKey).toString('base64')}`,
    'Timestamp':     timestamp,
    'Digest-Method': 'HS256',
    'Digest':        digest,
    'Signed-Fields': signedFieldNames.join(','),
  };
}

function baseUrl(): string {
  return process.env.SELCOM_BASE_URL || 'https://apigwtest.selcom.net';
}

// ── Create a payment order ────────────────────────────────────────────────────

export async function createSelcomOrder(
  req: SelcomOrderRequest,
): Promise<SelcomOrderResponse> {
  const callbackUrl = `${process.env.APP_URL}/subscriptions/webhook/selcom`;

  const body = {
    vendor:          process.env.SELCOM_VENDOR_ID,
    order_id:        req.orderId,
    buyer_name:      req.buyerName,
    buyer_phone:     req.buyerPhone,
    buyer_email:     req.buyerEmail ?? '',
    amount:          req.amountTzs.toString(),
    currency:        'TZS',
    payment_methods: 'ALL',       // TIGOPESA, MPESA, AIRTELMONEY, HALOPESA, VISA etc.
    no_of_items:     1,
    narration:       req.narration,
    redirect_url:    `${process.env.APP_URL?.replace('api.', 'app.')}/subscription/success`,
    cancel_url:      `${process.env.APP_URL?.replace('api.', 'app.')}/subscription/cancel`,
    webhook:         callbackUrl,
    billing:         { firstname: req.buyerName.split(' ')[0], lastname: req.buyerName.split(' ').slice(1).join(' ') || '-' },
  };

  // The fields Selcom requires in the signature for create-order
  const signedFieldNames = ['vendor', 'order_id', 'buyer_name', 'buyer_phone', 'amount', 'currency', 'payment_methods', 'no_of_items'];
  const headers = buildAuthHeaders(body as Record<string, unknown>, signedFieldNames);

  const res = await fetch(`${baseUrl()}/v3/checkout/create-order`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });

  const json = await res.json() as {
    resultcode: string;
    result: string;
    message?: string;
    data?: { gateway_buyer_uuid?: string; payment_gateway_url?: string };
  };

  if (json.resultcode !== '000') {
    throw new Error(`Selcom order creation failed: ${json.result} — ${json.message ?? 'no detail'}`);
  }

  return {
    success:           true,
    selcomOrderId:     req.orderId,   // we use our ID as selcom order_id
    paymentGatewayUrl: json.data?.payment_gateway_url,
    raw:               json,
  };
}

// ── Verify webhook signature ──────────────────────────────────────────────────

/**
 * Verify a Selcom webhook callback.
 *
 * Selcom sends the webhook with its own auth headers (Authorization, Digest,
 * Signed-Fields, Timestamp). The `Digest` is HMAC-SHA256 over the concatenated
 * values of the `Signed-Fields` from the posted JSON body, signed with YOUR
 * API secret.
 *
 * Usage in your webhook route:
 *   const valid = verifySelcomWebhook(req.headers, req.body);
 *   if (!valid) return res.status(401).json({ error: 'Invalid signature' });
 *
 * @param headers  - The incoming request headers (req.headers)
 * @param body     - The parsed JSON body (object, NOT raw string)
 */
export function verifySelcomWebhook(
  headers: Record<string, string | string[] | undefined>,
  body: Record<string, unknown>,
): boolean {
  const apiSecret = process.env.SELCOM_API_SECRET;
  if (!apiSecret) return false;

  const digest      = headers['digest'] as string | undefined;
  const signedFields = headers['signed-fields'] as string | undefined;

  if (!digest || !signedFields) return false;

  const fieldNames   = signedFields.split(',').map((f) => f.trim());
  const signedValues = fieldNames.map((key) => String(body[key] ?? '')).join('');

  const expected = crypto
    .createHmac('sha256', apiSecret)
    .update(signedValues)
    .digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(expected),
    );
  } catch {
    return false;
  }
}

// ── Query order status (optional polling fallback) ────────────────────────────

export async function querySelcomOrder(orderId: string): Promise<{
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  transid?: string;
  channel?: string;
  msisdn?: string;
}> {
  const body = {
    vendor:   process.env.SELCOM_VENDOR_ID!,
    order_id: orderId,
  };
  const headers = buildAuthHeaders(body as Record<string, unknown>, ['vendor', 'order_id']);

  const res = await fetch(`${baseUrl()}/v3/checkout/order-status`, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
  });

  const json = await res.json() as {
    resultcode: string;
    result: string;
    data?: { result?: string; transid?: string; channel?: string; msisdn?: string };
  };

  const status = json.data?.result ?? json.result;
  return {
    status:  (status === 'SUCCESS' ? 'SUCCESS' : status === 'FAILED' ? 'FAILED' : 'PENDING'),
    transid: json.data?.transid,
    channel: json.data?.channel,
    msisdn:  json.data?.msisdn,
  };
}
