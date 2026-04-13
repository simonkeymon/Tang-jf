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

describe('Achievement endpoints', () => {
  it('unlocks streak-3 after qualifying streak', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'achievement@example.com');

    const payloads = [
      { date: '2026-04-10', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-10', meal_type: '午餐', status: 'completed' },
      { date: '2026-04-11', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-11', meal_type: '午餐', status: 'completed' },
      { date: '2026-04-12', meal_type: '早餐', status: 'completed' },
      { date: '2026-04-12', meal_type: '午餐', status: 'completed' },
    ];

    for (const payload of payloads) {
      await request(app)
        .post('/api/tracking/checkin')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);
    }

    const res = await request(app).get('/api/achievements').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(
      res.body.achievements.find((item: { id: string }) => item.id === 'streak-3').unlocked,
    ).toBe(true);
  });
});
