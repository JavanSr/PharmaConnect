import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import app from '../src/index';
import { prisma } from '../src/lib/prisma';
import { createPharmacy, createUser, disconnectTestDb } from './helpers';

describe('staff activity instrumentation', () => {
  afterAll(async () => {
    await disconnectTestDb();
  });

  it('records a durable audit row for each successful login', async () => {
    const pharmacy = await createPharmacy();
    const account = await createUser({ pharmacyId: pharmacy.id, role: 'OWNER' });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: account.user.email, password: account.password });

    expect(response.status).toBe(200);

    const rows = await prisma.$queryRaw<Array<{
      pharmacy_id: string | null;
      table_name: string;
      record_id: string | null;
      action: string;
      acted_by: string | null;
      created_at: Date;
    }>>`
      SELECT "pharmacy_id", "table_name", "record_id", "action", "acted_by", "created_at"
      FROM "audit_log"
      WHERE "acted_by" = ${account.user.id}
        AND "table_name" = 'auth_sessions'
        AND "action" = 'LOGIN'
      ORDER BY "created_at" DESC
      LIMIT 1
    `;

    expect(rows[0]).toMatchObject({
      pharmacy_id: pharmacy.id,
      table_name: 'auth_sessions',
      record_id: account.user.id,
      action: 'LOGIN',
      acted_by: account.user.id,
    });
    expect(rows[0]?.created_at).toBeInstanceOf(Date);
  });
});
