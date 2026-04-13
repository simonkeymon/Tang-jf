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

async function createProfile(
  app: ReturnType<typeof createTestApp>,
  token: string,
  body: Record<string, unknown>,
) {
  return request(app).put('/api/user/profile').set('Authorization', `Bearer ${token}`).send(body);
}

describe('Plan endpoints', () => {
  it('generates a plan for a male user', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'plan-male@example.com');

    await createProfile(app, token, {
      gender: 'male',
      age: 30,
      height_cm: 175,
      weight_kg: 80,
      goal: 'maintain',
      activity_level: 'moderately_active',
      dietary_restrictions: [],
      allergies: [],
    });

    const res = await request(app)
      .post('/api/plan/generate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.plan.daily_calorie_target).toBeGreaterThanOrEqual(1500);
    expect(res.body.plan.macro_ratio).toEqual({ protein: 30, carbohydrate: 40, fat: 30 });
    expect(res.body.plan.status).toBe('active');
  });

  it('enforces the safety floor for a female user', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'plan-female@example.com');

    await createProfile(app, token, {
      gender: 'female',
      age: 40,
      height_cm: 150,
      weight_kg: 40,
      goal: 'lose',
      activity_level: 'sedentary',
      dietary_restrictions: [],
      allergies: [],
    });

    const res = await request(app)
      .post('/api/plan/generate')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(201);
    expect(res.body.plan.daily_calorie_target).toBeGreaterThanOrEqual(1200);
  });

  it('returns current plan after generation and lists plans', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'plan-current@example.com');

    await createProfile(app, token, {
      gender: 'male',
      age: 28,
      height_cm: 180,
      weight_kg: 75,
      goal: 'gain',
      activity_level: 'very_active',
      dietary_restrictions: [],
      allergies: [],
    });

    const generateRes = await request(app)
      .post('/api/plan/generate')
      .set('Authorization', `Bearer ${token}`);

    const currentRes = await request(app)
      .get('/api/plan/current')
      .set('Authorization', `Bearer ${token}`);

    const listRes = await request(app)
      .get('/api/plan/list')
      .set('Authorization', `Bearer ${token}`);

    const idRes = await request(app)
      .get(`/api/plan/${generateRes.body.plan.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(currentRes.status).toBe(200);
    expect(currentRes.body.plan.id).toBe(generateRes.body.plan.id);
    expect(listRes.status).toBe(200);
    expect(listRes.body.plans).toHaveLength(1);
    expect(idRes.status).toBe(200);
    expect(idRes.body.plan.id).toBe(generateRes.body.plan.id);
  });

  it('rejects unauthenticated access', async () => {
    const app = createTestApp();

    const generateRes = await request(app).post('/api/plan/generate');
    const currentRes = await request(app).get('/api/plan/current');

    expect(generateRes.status).toBe(401);
    expect(currentRes.status).toBe(401);
  });
});
