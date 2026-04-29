import jwt from 'jsonwebtoken';

const ACCESS_SECRET =
  process.env.JWT_SECRET ??
  process.env.JWT_PRIVATE_KEY ??
  process.env.JWT_ACCESS_SECRET ??
  '';
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ??
  process.env.JWT_REFRESH_PRIVATE_KEY ??
  '';
const ACCESS_EXPIRES  = process.env.JWT_EXPIRES_IN  || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

if (ACCESS_SECRET.length < 32) {
  console.error(
    '[startup] JWT_SECRET must be at least 32 characters. Railway can use JWT_SECRET, JWT_PRIVATE_KEY, or JWT_ACCESS_SECRET. Generate one with: openssl rand -hex 32'
  );
  process.exit(1);
}

if (REFRESH_SECRET.length < 32) {
  console.error(
    '[startup] JWT_REFRESH_SECRET must be at least 32 characters. Railway can use JWT_REFRESH_SECRET or JWT_REFRESH_PRIVATE_KEY. Generate one with: openssl rand -hex 32'
  );
  process.exit(1);
}

export interface JwtPayload {
  userId: string;
  role: string;
  pharmacyId: string | null;
}

export function signAccess(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES } as jwt.SignOptions);
}

export function signRefresh(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES } as jwt.SignOptions);
}

export function verifyAccess(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefresh(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
