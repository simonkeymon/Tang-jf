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

describe('Tracking endpoints', () => {
  it('stores and queries weight entries by range', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'track-weight@example.com');

    await request(app)
      .post('/api/tracking/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-10', weight_kg: 75.5 });

    await request(app)
      .post('/api/tracking/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-11', weight_kg: 75.3 });

    const res = await request(app)
      .get('/api/tracking/weight?from=2026-04-10&to=2026-04-11')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.entries).toHaveLength(2);
  });

  it('updates same-day weight entry instead of duplicating', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'track-same-day@example.com');

    await request(app)
      .post('/api/tracking/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-10', weight_kg: 75.5 });

    await request(app)
      .post('/api/tracking/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-10', weight_kg: 74.9, note: 'updated' });

    const res = await request(app)
      .get('/api/tracking/weight?from=2026-04-10&to=2026-04-10')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.entries).toHaveLength(1);
    expect(res.body.entries[0]).toMatchObject({ weight_kg: 74.9, note: 'updated' });
  });

  it('calculates streak across consecutive qualifying days', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'track-streak@example.com');

    const payloads = [
      { date: '2026-04-10', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-10', meal_type: '午餐', status: 'completed' },
      { date: '2026-04-11', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-11', meal_type: '晚餐', status: 'completed' },
    ];

    for (const payload of payloads) {
      await request(app)
        .post('/api/tracking/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
    }

    const res = await request(app)
      .get('/api/tracking/streak')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(2);
  });

  it('resets streak after a non-qualifying day gap', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'track-reset@example.com');

    const payloads = [
      { date: '2026-04-10', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-10', meal_type: '午餐', status: 'completed' },
      { date: '2026-04-11', meal_type: '早餐', status: 'partial' },
      { date: '2026-04-12', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-12', meal_type: '晚餐', status: 'completed' },
    ];

    for (const payload of payloads) {
      await request(app)
        .post('/api/tracking/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
    }

    const res = await request(app)
      .get('/api/tracking/streak')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.streak).toBe(1);
  });

  it('rejects unauthenticated access', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/tracking/streak');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Authentication required' });
  });
});
