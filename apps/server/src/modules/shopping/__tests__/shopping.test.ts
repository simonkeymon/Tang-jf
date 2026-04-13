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

async function setupRecipes(app: ReturnType<typeof createTestApp>, token: string, days: string[]) {
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

  for (const date of days) {
    await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date });
  }
}

describe('Shopping endpoints', () => {
  it('generates a merged shopping list', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'shopping@example.com');
    await setupRecipes(app, token, ['2026-04-15', '2026-04-16', '2026-04-17']);

    const res = await request(app)
      .post('/api/shopping/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ days: 3 });

    expect(res.status).toBe(201);
    expect(res.body.shoppingList.items.length).toBeGreaterThan(0);
    expect(
      res.body.shoppingList.items.some((item: { category: string }) => item.category === '蔬菜'),
    ).toBe(true);
    expect(res.body.shoppingList.items.some((item: { name: string }) => item.name === '蒜末')).toBe(
      true,
    );
  });

  it('updates purchased status for an item', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'shopping-update@example.com');
    await setupRecipes(app, token, ['2026-04-15']);

    const generated = await request(app)
      .post('/api/shopping/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ days: 1 });

    const listId = generated.body.shoppingList.id;
    const itemId = generated.body.shoppingList.items[0].id;

    const patchRes = await request(app)
      .patch(`/api/shopping/${listId}/item/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ purchased: true });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.item.purchased).toBe(true);

    const getRes = await request(app)
      .get(`/api/shopping/${listId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.body.shoppingList.items[0].purchased).toBe(true);
  });
});
