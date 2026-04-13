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

async function setupPlan(app: ReturnType<typeof createTestApp>, token: string) {
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
}

describe('Recipe from ingredients endpoint', () => {
  it('generates recipes primarily using provided ingredients', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'ingredients@example.com');
    await setupPlan(app, token);

    const res = await request(app)
      .post('/api/recipe/from-ingredients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ingredients: ['鸡胸肉', '西兰花', '胡萝卜', '大蒜'], meals: 2 });

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(2);
    const firstRecipeIngredients = res.body.recipes[0].ingredients.map(
      (item: { name: string }) => item.name,
    );
    expect(
      firstRecipeIngredients.filter((name: string) =>
        ['鸡胸肉', '西兰花', '胡萝卜', '大蒜'].includes(name),
      ).length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('rejects an empty ingredients list', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'ingredients-empty@example.com');
    await setupPlan(app, token);

    const res = await request(app)
      .post('/api/recipe/from-ingredients')
      .set('Authorization', `Bearer ${token}`)
      .send({ ingredients: [] });

    expect(res.status).toBe(400);
  });
});
