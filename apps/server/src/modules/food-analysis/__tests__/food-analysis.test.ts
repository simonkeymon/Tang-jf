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

describe('Food analysis endpoints', () => {
  it('analyzes a food image and returns structured result', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'food@example.com');

    const res = await request(app)
      .post('/api/food/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ image_url: 'https://example.com/food.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.analysis.foods).toHaveLength(3);
    expect(res.body.analysis.total_calories).toBeGreaterThan(0);
    expect(res.body.analysis.confidence).toBe('medium');
    expect(res.body.analysis.foods[0]).toMatchObject({
      name: expect.any(String),
      estimated_portion: expect.any(String),
      estimated_calories: expect.any(Number),
    });
  });

  it('returns low confidence and zero calories for non-food images', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'food-low@example.com');

    const res = await request(app)
      .post('/api/food/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ image_url: 'https://example.com/dog.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.analysis.confidence).toBe('low');
    expect(res.body.analysis.total_calories).toBe(0);
    expect(res.body.analysis.foods).toEqual([]);
  });

  it('rejects unauthenticated access', async () => {
    const app = createTestApp();

    const res = await request(app)
      .post('/api/food/analyze')
      .send({ image_url: 'https://example.com/food.jpg' });

    expect(res.status).toBe(401);
  });
});
