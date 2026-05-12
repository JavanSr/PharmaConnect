import request from 'supertest';

import app from '../src/index';

describe('production CORS', () => {
  it('allows the Vercel frontend to preflight registration', async () => {
    const res = await request(app)
      .options('/api/v1/auth/register')
      .set('Origin', 'https://pharma-connect-rouge.vercel.app')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'Content-Type, Authorization');

    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('https://pharma-connect-rouge.vercel.app');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
    expect(res.headers['access-control-allow-headers']).toContain('Content-Type');
    expect(res.headers['access-control-allow-headers']).toContain('Authorization');
  });

  it('allows localhost development origins', async () => {
    for (const origin of ['http://localhost:3000', 'http://localhost:5173']) {
      const res = await request(app)
        .options('/api/v1/auth/register')
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');

      expect(res.status).toBe(204);
      expect(res.headers['access-control-allow-origin']).toBe(origin);
    }
  });
});
