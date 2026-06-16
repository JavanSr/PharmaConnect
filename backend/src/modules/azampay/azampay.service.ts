/**
 * AzamPay integration — MNO STK push for subscription payments (Tanzania).
 *
 * Env vars required:
 *   AZAMPAY_APP_NAME       — e.g. "APOTEKH"
 *   AZAMPAY_CLIENT_ID      — from AzamPay dashboard
 *   AZAMPAY_CLIENT_SECRET  — from AzamPay dashboard
 *   AZAMPAY_ENVIRONMENT    — "sandbox" | "production" (default: sandbox)
 *
 * Flow:
 *   1. Backend fetches a short-lived bearer token from AzamPay authenticator.
 *   2. Backend calls MNO checkout — AzamPay sends STK push to payer's phone.
 *   3. Payer approves on phone.
 *   4. AzamPay POSTs callback to /api/v1/azampay/callback.
 *   5. Backend calls activateSubscriptionFromPayment and subscription goes ACTIVE.
 */

import https from 'https';

const isSandbox = (process.env.AZAMPAY_ENVIRONMENT ?? 'sandbox') !== 'production';

const AZAMPAY_URLS = {
  auth: isSandbox
    ? 'https://authenticator-sandbox.azampay.co.tz/AppRegistration/GenerateToken'
    : 'https://authenticator.azampay.co.tz/AppRegistration/GenerateToken',
  checkout: isSandbox
    ? 'https://sandbox.azampay.co.tz/azampay/mno/checkout'
    : 'https://checkout.azampay.co.tz/azampay/mno/checkout',
};

/** Cached token + expiry */
let _cachedToken: { token: string; expiresAt: number } | null = null;

export function isAzamPayConfigured(): boolean {
  return Boolean(
    process.env.AZAMPAY_APP_NAME &&
    process.env.AZAMPAY_CLIENT_ID &&
    process.env.AZAMPAY_CLIENT_SECRET,
  );
}

async function fetchToken(): Promise<string> {
  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAt > now + 30_000) {
    return _cachedToken.token;
  }

  const body = JSON.stringify({
    appName: process.env.AZAMPAY_APP_NAME,
    clientId: process.env.AZAMPAY_CLIENT_ID,
    clientSecret: process.env.AZAMPAY_CLIENT_SECRET,
  });

  const response = await postJson<{ data: { accessToken: string; expire: string } }>(
    AZAMPAY_URLS.auth,
    body,
    null,
  );

  const token = response?.data?.accessToken;
  if (!token) {
    throw Object.assign(new Error('AzamPay: failed to obtain access token'), { status: 502 });
  }

  // AzamPay tokens typically expire in 3 hours; cache for 2h50m to be safe
  const expiresAt = response?.data?.expire
    ? new Date(response.data.expire).getTime()
    : now + 170 * 60 * 1000;

  _cachedToken = { token, expiresAt };
  return token;
}

/** Detect MNO from Tanzanian phone number prefix */
export function detectProvider(phone: string): string {
  const normalised = phone.replace(/\D/g, '');
  // Remove leading country code 255 or 0 to get network prefix
  const local = normalised.startsWith('255') ? normalised.slice(3) : normalised.replace(/^0/, '');
  const prefix2 = local.slice(0, 2);
  const prefix3 = local.slice(0, 3);

  // Vodacom M-Pesa: 074, 075, 076
  if (['074', '075', '076'].includes(prefix3)) return 'Mpesa';
  // Tigo: 071, 065, 067
  if (['071', '065', '067'].includes(prefix3)) return 'Tigopesa';
  // Airtel: 068, 069, 078
  if (['068', '069', '078'].includes(prefix3)) return 'AirtelMoney';
  // Halotel: 062
  if (prefix3 === '062') return 'Halopesa';
  // TTCL: 073
  if (prefix3 === '073') return 'TTCL';
  // Zantel (prefix 077)
  if (prefix3 === '077') return 'Azampesa';

  // Fallback by 2-digit prefix
  if (prefix2 === '07') return 'Mpesa';
  return 'Mpesa';
}

export interface AzamPayCheckoutResult {
  success: boolean;
  transactionId: string | null;
  message: string;
  rawResponse: unknown;
}

export async function initiateAzamPayCheckout(input: {
  phone: string;
  amount: number;
  reference: string;
  currency?: string;
}): Promise<AzamPayCheckoutResult> {
  const token = await fetchToken();

  const provider = detectProvider(input.phone);
  const phone = input.phone.replace(/\D/g, '');
  // Ensure E.164 without + (AzamPay expects digits only, starting with 255)
  const normalisedPhone = phone.startsWith('255') ? phone : `255${phone.replace(/^0/, '')}`;

  const body = JSON.stringify({
    accountNumber: normalisedPhone,
    amount: String(input.amount),
    currency: input.currency ?? 'TZS',
    externalId: input.reference,
    provider,
    additionalProperties: {},
  });

  console.info('[azampay] initiating checkout', {
    reference: input.reference,
    provider,
    phone: normalisedPhone,
    amount: input.amount,
    env: isSandbox ? 'sandbox' : 'production',
  });

  const response = await postJson<{
    success?: boolean;
    message?: string;
    transactionId?: string;
    transId?: string;
  }>(AZAMPAY_URLS.checkout, body, token);

  const success = Boolean(response?.success ?? response?.message?.toLowerCase().includes('success'));
  const transactionId = response?.transactionId ?? response?.transId ?? null;

  return {
    success,
    transactionId,
    message: response?.message ?? (success ? 'STK push sent' : 'Checkout failed'),
    rawResponse: response,
  };
}

/** Minimal HTTPS POST helper — no axios dep needed here */
function postJson<T>(url: string, body: string, bearerToken: string | null): Promise<T> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data) as T);
        } catch {
          reject(new Error(`AzamPay: non-JSON response (${res.statusCode}): ${data.slice(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(15_000, () => {
      req.destroy(new Error('AzamPay: request timeout'));
    });
    req.write(body);
    req.end();
  });
}
