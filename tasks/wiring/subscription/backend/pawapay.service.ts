// backend/src/modules/subscriptions/pawapay.service.ts
//
// PawaPay mobile money integration for APOTEKH subscription billing.
// Replaces selcom.service.ts — drop-in, same interface.
//
// Docs: https://docs.pawapay.io
//
// Required env vars:
//   PAWAPAY_API_TOKEN   – generated from dashboard.pawapay.io (production)
//                         or dashboard.sandbox.pawapay.io (sandbox)
//   PAWAPAY_BASE_URL    – https://api.sandbox.pawapay.io  (sandbox)
//                         https://api.pawapay.io          (production)
//   APP_URL             – https://api.apotekh.co.tz
//
// Tanzania correspondents (network codes):
//   VODACOM_TZA  – M-Pesa (Vodacom)   prefixes: 074x, 075x, 076x
//   TIGO_TZA     – Tigo Pesa / Mixx   prefixes: 071x, 065x, 067x
//   AIRTEL_TZA   – Airtel Money       prefixes: 068x, 069x, 078x
//   HALOTEL_TZA  – HaloPesa           prefixes: 062x
// ─────────────────────────────────────────────────────────────────────────────

import { randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

type TanzaniaCorrespondent =
  | 'VODACOM_TZA'
  | 'TIGO_TZA'
  | 'AIRTEL_TZA'
  | 'HALOTEL_TZA';

export interface PaymentRequest {
  /** Your internal payment ID — stored as depositId in PawaPay */
  paymentId: string;
  /** Amount in TZS — whole numbers only (no decimals for TZS) */
  amountTzs: number;
  /** Phone number in international format: 255XXXXXXXXX */
  phone: string;
  /** Short description, 4–22 alphanumeric chars shown on customer receipt */
  description: string;
}

export interface PaymentInitResponse {
  /** The depositId we sent to PawaPay (same as paymentId) */
  depositId: string;
  /** ACCEPTED = being processed, REJECTED = failed immediately */
  status: 'ACCEPTED' | 'REJECTED' | 'DUPLICATE_IGNORED';
  rejectionReason?: string;
}

export interface PawapayWebhookPayload {
  depositId:        string;
  status:           'COMPLETED' | 'FAILED';
  requestedAmount:  string;
  depositedAmount?: string;
  currency:         string;
  correspondent:    string;
  payer:            { type: string; address: { value: string } };
  customerTimestamp: string;
  created:          string;
  respondedByPayer?: string;
  correspondentIds?: Record<string, string>;
  failureReason?: {
    failureCode:    string;
    failureMessage: string;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function baseUrl(): string {
  return process.env.PAWAPAY_BASE_URL ?? 'https://api.sandbox.pawapay.io';
}

function authHeaders(): Record<string, string> {
  const token = process.env.PAWAPAY_API_TOKEN;
  if (!token) throw new Error('PAWAPAY_API_TOKEN is not set');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type':  'application/json',
  };
}

/**
 * Detect the PawaPay correspondent code from a Tanzanian phone number.
 * Uses PawaPay's predict-correspondent endpoint — accurate and up to date.
 * Falls back to prefix-based detection if the API call fails.
 */
export async function detectCorrespondent(phone: string): Promise<TanzaniaCorrespondent> {
  try {
    const res = await fetch(`${baseUrl()}/v1/toolkit/predict-correspondent`, {
      method:  'POST',
      headers: authHeaders(),
      body:    JSON.stringify({ msisdn: phone, country: 'TZA' }),
    });
    if (res.ok) {
      const json = await res.json() as {
        correspondent?: TanzaniaCorrespondent;
        correspondents?: { correspondent: TanzaniaCorrespondent; confidence: number }[];
      };
      // API returns the best match
      const found = json.correspondent
        ?? json.correspondents?.[0]?.correspondent;
      if (found) return found;
    }
  } catch {
    // fall through to prefix detection
  }

  // Prefix-based fallback (Tanzania national prefix rules)
  const digits = phone.replace(/\D/g, '');
  const local   = digits.startsWith('255') ? digits.slice(3) : digits;
  const prefix3 = local.slice(0, 3);

  const map: Record<string, TanzaniaCorrespondent> = {
    // Vodacom M-Pesa
    '074': 'VODACOM_TZA', '075': 'VODACOM_TZA', '076': 'VODACOM_TZA',
    // Tigo / Mixx
    '071': 'TIGO_TZA', '065': 'TIGO_TZA', '067': 'TIGO_TZA',
    // Airtel
    '068': 'AIRTEL_TZA', '069': 'AIRTEL_TZA', '078': 'AIRTEL_TZA',
    // Halotel
    '062': 'HALOTEL_TZA', '061': 'HALOTEL_TZA',
  };

  return map[prefix3] ?? 'VODACOM_TZA'; // default to M-Pesa if unknown
}

// ── Initiate a deposit (collect subscription payment) ────────────────────────

/**
 * Send a deposit request to PawaPay. The customer will receive a USSD prompt
 * to enter their PIN and authorise the payment.
 *
 * PawaPay is asynchronous — this returns ACCEPTED immediately. The final
 * result (COMPLETED / FAILED) arrives via webhook callback.
 */
export async function initiateDeposit(req: PaymentRequest): Promise<PaymentInitResponse> {
  const correspondent = await detectCorrespondent(req.phone);

  // statementDescription: 4–22 alphanumeric chars, no special characters
  const description = req.description
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .slice(0, 22)
    .padEnd(4, ' ')
    .trim()
    .padEnd(4, 'X'); // ensure minimum 4 chars

  const body = {
    depositId:           req.paymentId,           // our UUID — idempotency key
    amount:              req.amountTzs.toString(), // TZS = no decimal places
    currency:            'TZS',
    country:             'TZA',
    correspondent,
    payer: {
      type:    'MSISDN',
      address: { value: req.phone },
    },
    customerTimestamp:   new Date().toISOString(),
    statementDescription: description,
    metadata: [
      { fieldName: 'service',   fieldValue: 'APOTEKH Subscription' },
      { fieldName: 'paymentId', fieldValue: req.paymentId },
    ],
  };

  const res = await fetch(`${baseUrl()}/deposits`, {
    method:  'POST',
    headers: authHeaders(),
    body:    JSON.stringify(body),
  });

  const json = await res.json() as {
    depositId:      string;
    status:         'ACCEPTED' | 'REJECTED' | 'DUPLICATE_IGNORED';
    rejectionReason?: { rejectionCode: string; rejectionMessage?: string };
  };

  if (!res.ok && json.status !== 'REJECTED') {
    throw new Error(`PawaPay deposit error ${res.status}: ${JSON.stringify(json)}`);
  }

  return {
    depositId:      json.depositId,
    status:         json.status,
    rejectionReason: json.rejectionReason
      ? `${json.rejectionReason.rejectionCode}: ${json.rejectionReason.rejectionMessage ?? ''}`
      : undefined,
  };
}

// ── Check deposit status (polling fallback if webhook doesn't arrive) ─────────

export async function checkDepositStatus(depositId: string): Promise<{
  status:           'ACCEPTED' | 'COMPLETED' | 'FAILED';
  depositedAmount?: string;
  correspondent?:   string;
  payerPhone?:      string;
}> {
  const res = await fetch(`${baseUrl()}/deposits/${depositId}`, {
    method:  'GET',
    headers: authHeaders(),
  });

  const json = await res.json() as {
    depositId:        string;
    status:           string;
    depositedAmount?: string;
    correspondent?:   string;
    payer?:           { address?: { value?: string } };
  };

  return {
    status:           (json.status as 'ACCEPTED' | 'COMPLETED' | 'FAILED'),
    depositedAmount:  json.depositedAmount,
    correspondent:    json.correspondent,
    payerPhone:       json.payer?.address?.value,
  };
}
