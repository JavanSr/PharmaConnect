import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-at-least-32-characters';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars';
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 're_test_key';
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

// Cap the Prisma pool per test worker: each test file runs in its own fork and
// the default pool (2×CPU+1) exhausts the direct-connection limit on the
// hosted Postgres once a few files run back-to-back.
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('connection_limit=')) {
  const sep = process.env.DATABASE_URL.includes('?') ? '&' : '?';
  process.env.DATABASE_URL = `${process.env.DATABASE_URL}${sep}connection_limit=5&pool_timeout=60`;
}
