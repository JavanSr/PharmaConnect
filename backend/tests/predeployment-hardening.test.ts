import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createPharmacy, createUser, disconnectTestDb, login } from './helpers';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

describe('pre-deployment hardening', () => {
  afterAll(async () => {
    await rm(path.resolve(process.cwd(), 'uploads', 'predeployment-tests'), { recursive: true, force: true });
    await disconnectTestDb();
  });

  it('reports readiness only after the API can reach the database', async () => {
    const response = await request(app).get('/api/v1/ready');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ready');
    expect(response.body.checks.database).toBe('ok');
  });

  it('resets passwords with expiring single-use tokens and clears old sessions', async () => {
    const pharmacy = await createPharmacy();
    const account = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER', password: 'OldPass!123' });
    const resetToken = crypto.randomBytes(32).toString('hex');

    await prisma.user.update({
      where: { id: account.user.id },
      data: {
        passwordResetToken: hashToken(resetToken),
        passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });
    await prisma.refreshToken.create({
      data: {
        userId: account.user.id,
        token: hashToken(`old-refresh-token-${account.user.id}`),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    const response = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'NewPass!123' });

    expect(response.status).toBe(200);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: account.user.id } });
    expect(updated.passwordResetToken).toBeNull();
    expect(updated.passwordResetExpiry).toBeNull();
    expect(await prisma.refreshToken.count({ where: { userId: account.user.id } })).toBe(0);

    const reused = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: resetToken, password: 'AnotherPass!123' });
    expect(reused.status).toBe(400);

    const loginResponse = await login(account.user.email, 'NewPass!123');
    expect(loginResponse.status).toBe(200);
  });

  it('enforces pharmacy ownership before serving uploaded prescription files', async () => {
    const ownerPharmacy = await createPharmacy();
    const otherPharmacy = await createPharmacy();
    const owner = await createUser({ pharmacyId: ownerPharmacy.id, role: 'OWNER' });
    const other = await createUser({ pharmacyId: otherPharmacy.id, role: 'OWNER' });
    const ownerAuth = await login(owner.user.email, owner.password);
    const otherAuth = await login(other.user.email, other.password);
    const relativePath = 'uploads/predeployment-tests/prescription.txt';
    const absolutePath = path.resolve(process.cwd(), relativePath);

    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, 'prescription attachment');
    await prisma.prescription.create({
      data: {
        pharmacyId: ownerPharmacy.id,
        referenceNumber: 'RX-PREDEPLOY',
        photoPath: relativePath,
        createdBy: owner.user.id,
      },
    });

    const allowed = await request(app)
      .get('/uploads/predeployment-tests/prescription.txt')
      .set('Authorization', `Bearer ${ownerAuth.body.data.accessToken}`);
    expect(allowed.status).toBe(200);
    expect(allowed.text).toBe('prescription attachment');

    const blocked = await request(app)
      .get('/uploads/predeployment-tests/prescription.txt')
      .set('Authorization', `Bearer ${otherAuth.body.data.accessToken}`);
    expect(blocked.status).toBe(404);
  });
});
