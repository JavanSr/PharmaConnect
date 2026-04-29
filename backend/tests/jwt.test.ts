import { generateKeyPairSync } from 'node:crypto';

async function loadJwtModule() {
  vi.resetModules();
  return import('../src/lib/jwt');
}

describe('jwt helpers', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('signs and verifies access and refresh tokens with shared secrets', async () => {
    process.env.JWT_SECRET = 'access-secret-at-least-32-characters';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret-at-least-32-characters';
    delete process.env.JWT_PRIVATE_KEY;
    delete process.env.JWT_PUBLIC_KEY;

    const { signAccess, signRefresh, verifyAccess, verifyRefresh } = await loadJwtModule();
    const payload = { userId: 'user-1', role: 'OWNER', pharmacyId: 'pharmacy-1' };

    expect(verifyAccess(signAccess(payload))).toMatchObject(payload);
    expect(verifyRefresh(signRefresh(payload))).toMatchObject(payload);
  });

  it('signs and verifies access tokens with RSA private and public keys', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    process.env.JWT_PRIVATE_KEY = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
    process.env.JWT_PUBLIC_KEY = publicKey.export({ format: 'pem', type: 'spki' }).toString();
    process.env.JWT_REFRESH_SECRET = 'refresh-secret-at-least-32-characters';
    delete process.env.JWT_SECRET;

    const { signAccess, verifyAccess } = await loadJwtModule();
    const payload = { userId: 'user-rsa', role: 'OWNER', pharmacyId: null };

    expect(verifyAccess(signAccess(payload))).toMatchObject(payload);
  });
});
