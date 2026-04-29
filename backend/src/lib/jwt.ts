import jwt from 'jsonwebtoken';

function normalizeKey(value: string | undefined): string {
  return (value ?? '').replace(/\\n/g, '\n').trim();
}

function isPemPrivateKey(value: string): boolean {
  return /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value);
}

function isPemPublicKey(value: string): boolean {
  return /-----BEGIN [A-Z ]*PUBLIC KEY-----/.test(value);
}

const ACCESS_SIGNING_KEY = normalizeKey(
  process.env.JWT_SECRET ??
  process.env.JWT_PRIVATE_KEY ??
  process.env.JWT_ACCESS_SECRET,
);
const ACCESS_VERIFYING_KEY = normalizeKey(
  process.env.JWT_PUBLIC_KEY ??
  process.env.JWT_ACCESS_PUBLIC_KEY,
);
const REFRESH_SIGNING_KEY = normalizeKey(
  process.env.JWT_REFRESH_SECRET ??
  process.env.JWT_REFRESH_PRIVATE_KEY,
);
const REFRESH_VERIFYING_KEY = normalizeKey(process.env.JWT_REFRESH_PUBLIC_KEY);
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const ACCESS_USES_RSA = isPemPrivateKey(ACCESS_SIGNING_KEY);
const REFRESH_USES_RSA = isPemPrivateKey(REFRESH_SIGNING_KEY);
const ACCESS_VERIFY_KEY = ACCESS_USES_RSA ? (ACCESS_VERIFYING_KEY || ACCESS_SIGNING_KEY) : ACCESS_SIGNING_KEY;
const REFRESH_VERIFY_KEY = REFRESH_USES_RSA ? (REFRESH_VERIFYING_KEY || REFRESH_SIGNING_KEY) : REFRESH_SIGNING_KEY;

function accessConfigError(): string | null {
  if (ACCESS_SIGNING_KEY.length < 32) {
    return 'JWT_SECRET must be at least 32 characters, or JWT_PRIVATE_KEY must be a valid PEM private key.';
  }

  if (ACCESS_USES_RSA && ACCESS_VERIFYING_KEY && !isPemPublicKey(ACCESS_VERIFYING_KEY)) {
    return 'JWT_PUBLIC_KEY must be a valid PEM public key when JWT_PRIVATE_KEY is used.';
  }

  return null;
}

function refreshConfigError(): string | null {
  if (REFRESH_SIGNING_KEY.length < 32) {
    return 'JWT_REFRESH_SECRET must be at least 32 characters. Railway can use JWT_REFRESH_SECRET or JWT_REFRESH_PRIVATE_KEY. Generate one with: openssl rand -hex 32';
  }

  if (REFRESH_USES_RSA && REFRESH_VERIFYING_KEY && !isPemPublicKey(REFRESH_VERIFYING_KEY)) {
    return 'JWT_REFRESH_PUBLIC_KEY must be a valid PEM public key when JWT_REFRESH_PRIVATE_KEY is used.';
  }

  return null;
}

const startupAccessConfigError = accessConfigError();
const startupRefreshConfigError = refreshConfigError();

if (startupAccessConfigError) {
  console.warn(`[startup] ${startupAccessConfigError} Auth token issuing will fail until this is fixed.`);
}

if (startupRefreshConfigError) {
  console.warn(`[startup] ${startupRefreshConfigError} Refresh token issuing will fail until this is fixed.`);
}

export interface JwtPayload {
  userId: string;
  role: string;
  pharmacyId: string | null;
}

export function signAccess(payload: JwtPayload): string {
  const error = accessConfigError();
  if (error) {
    throw Object.assign(new Error(error), { status: 500 });
  }

  return jwt.sign(payload, ACCESS_SIGNING_KEY, {
    expiresIn: ACCESS_EXPIRES,
    algorithm: ACCESS_USES_RSA ? 'RS256' : 'HS256',
  } as jwt.SignOptions);
}

export function signRefresh(payload: JwtPayload): string {
  const error = refreshConfigError();
  if (error) {
    throw Object.assign(new Error(error), { status: 500 });
  }

  return jwt.sign(payload, REFRESH_SIGNING_KEY, {
    expiresIn: REFRESH_EXPIRES,
    algorithm: REFRESH_USES_RSA ? 'RS256' : 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccess(token: string): JwtPayload {
  const error = accessConfigError();
  if (error) {
    throw Object.assign(new Error(error), { status: 500 });
  }

  return jwt.verify(token, ACCESS_VERIFY_KEY, {
    algorithms: [ACCESS_USES_RSA ? 'RS256' : 'HS256'],
  }) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  const error = refreshConfigError();
  if (error) {
    throw Object.assign(new Error(error), { status: 500 });
  }

  return jwt.verify(token, REFRESH_VERIFY_KEY, {
    algorithms: [REFRESH_USES_RSA ? 'RS256' : 'HS256'],
  }) as JwtPayload;
}
