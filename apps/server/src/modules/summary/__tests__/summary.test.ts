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

describe('Summary endpoints', () => {
  it('generates summary with data present', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'summary-data@example.com');
    const date = '2026-04-12';

    await request(app).put('/api/user/profile').set('Authorization', `Bearer ${token}`).send({
      gender: 'male',
      age: 30,
      height_cm: 175,
      weight_kg: 80,
      goal: 'maintain',
      activity_level: 'moderately_active',
      dietary_restrictions: [],
      allergies: [],
    });

    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);
    await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date });
    await request(app)
      .post('/api/tracking/weight')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, weight_kg: 74.5 });
    await request(app)
      .post('/api/tracking/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, meal_type: '早餐', status: 'completed' });
    await request(app)
      .post('/api/tracking/checkin')
      .set('Authorization', `Bearer ${token}`)
      .send({ date, meal_type: '午餐', status: 'completed' });

    const res = await request(app)
      .post('/api/summary/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date });

    expect(res.status).toBe(200);
    expect(res.body.summary.meal_completion_rate).toBeGreaterThan(0);
    expect(res.body.summary.actual_vs_target_calories.target).toBeGreaterThan(0);
    expect(res.body.summary.weight_entry.weight_kg).toBe(74.5);
    expect(res.body.summary.ai_feedback).toContain('连续打卡');
  });

  it('generates encouraging summary on a no-data day', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'summary-empty@example.com');

    const res = await request(app)
      .post('/api/summary/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-13' });

    expect(res.status).toBe(200);
    expect(res.body.summary.meal_completion_rate).toBe(0);
    expect(res.body.summary.ai_feedback).toContain('没关系');
  });

  it('returns today summary after generation', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'summary-today@example.com');
    const today = new Date().toISOString().slice(0, 10);

    await request(app)
      .post('/api/summary/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today });

    const res = await request(app)
      .get('/api/summary/today')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.date).toBe(today);
  });

  it('returns summary by date after generation', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'summary-date@example.com');
    const date = '2026-04-14';

    await request(app)
      .post('/api/summary/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ date });

    const res = await request(app)
      .get(`/api/summary/${date}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.summary.date).toBe(date);
  });

  it('rejects unauthenticated access', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/summary/generate').send({ date: '2026-04-12' });

    expect(res.status).toBe(401);
  });
});
