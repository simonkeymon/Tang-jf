import request from 'supertest';

import { createTestApp } from '../../../test-utils/test-app.js';

async function registerAndGetToken(
  app: ReturnType<typeof createTestApp>,
  email: string,
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123' });

  return res.body.accessToken as string;
}

describe('Report endpoints', () => {
  it('generates and fetches a weekly report', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'report@example.com');

    const generateRes = await request(app)
      .post('/api/report/generate?type=weekly')
      .set('Authorization', `Bearer ${token}`);

    expect(generateRes.status).toBe(201);

    const getRes = await request(app)
      .get('/api/report/weekly')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.report.type).toBe('weekly');
  });
});
