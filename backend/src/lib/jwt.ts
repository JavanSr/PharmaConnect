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

if (ACCESS_SIGNING_KEY.length < 32) {
  console.error(
    '[startup] JWT_SECRET must be at least 32 characters, or JWT_PRIVATE_KEY must be a valid PEM private key.'
  );
  process.exit(1);
}

if (ACCESS_USES_RSA && ACCESS_VERIFYING_KEY && !isPemPublicKey(ACCESS_VERIFYING_KEY)) {
  console.error('[startup] JWT_PUBLIC_KEY must be a valid PEM public key when JWT_PRIVATE_KEY is used.');
  process.exit(1);
}

if (REFRESH_SIGNING_KEY.length < 32) {
  console.error(
    '[startup] JWT_REFRESH_SECRET must be at least 32 characters. Railway can use JWT_REFRESH_SECRET or JWT_REFRESH_PRIVATE_KEY. Generate one with: openssl rand -hex 32'
  );
  process.exit(1);
}

if (REFRESH_USES_RSA && REFRESH_VERIFYING_KEY && !isPemPublicKey(REFRESH_VERIFYING_KEY)) {
  console.error('[startup] JWT_REFRESH_PUBLIC_KEY must be a valid PEM public key when JWT_REFRESH_PRIVATE_KEY is used.');
  process.exit(1);
}

export interface JwtPayload {
  userId: string;
  role: string;
  pharmacyId: string | null;
}

export function signAccess(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SIGNING_KEY, {
    expiresIn: ACCESS_EXPIRES,
    algorithm: ACCESS_USES_RSA ? 'RS256' : 'HS256',
  } as jwt.SignOptions);
}

export function signRefresh(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SIGNING_KEY, {
    expiresIn: REFRESH_EXPIRES,
    algorithm: REFRESH_USES_RSA ? 'RS256' : 'HS256',
  } as jwt.SignOptions);
}

export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_VERIFY_KEY, {
    algorithms: [ACCESS_USES_RSA ? 'RS256' : 'HS256'],
  }) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_VERIFY_KEY, {
    algorithms: [REFRESH_USES_RSA ? 'RS256' : 'HS256'],
  }) as JwtPayload;
}
