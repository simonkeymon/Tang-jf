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

async function createRecipe(app: ReturnType<typeof createTestApp>, token: string) {
  const today = '2026-04-15';
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

  const res = await request(app)
    .post('/api/recipe/generate-daily')
    .set('Authorization', `Bearer ${token}`)
    .send({ date: today });

  return res.body.recipePlan.meals[1].id as string;
}

describe('Recipe favorites and swap endpoints', () => {
  it('favorites and unfavorites a recipe', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'favorite@example.com');
    const recipeId = await createRecipe(app, token);

    const favRes = await request(app)
      .post(`/api/recipe/${recipeId}/favorite`)
      .set('Authorization', `Bearer ${token}`);

    expect(favRes.status).toBe(200);

    const listRes = await request(app)
      .get('/api/recipe/favorites/list')
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.recipes).toHaveLength(1);

    const deleteRes = await request(app)
      .delete(`/api/recipe/${recipeId}/favorite`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);

    const emptyListRes = await request(app)
      .get('/api/recipe/favorites/list')
      .set('Authorization', `Bearer ${token}`);

    expect(emptyListRes.body.recipes).toHaveLength(0);
  });

  it('swaps recipe with a new title and similar calories', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'swap@example.com');
    const recipeId = await createRecipe(app, token);

    const before = await request(app)
      .get(`/api/recipe/${recipeId}`)
      .set('Authorization', `Bearer ${token}`);

    const swapRes = await request(app)
      .post(`/api/recipe/${recipeId}/swap`)
      .set('Authorization', `Bearer ${token}`);

    expect(swapRes.status).toBe(200);
    expect(swapRes.body.recipe.title).not.toBe(before.body.recipe.title);
    const beforeCalories = before.body.recipe.nutrition.calories;
    const afterCalories = swapRes.body.recipe.nutrition.calories;
    expect(Math.abs(afterCalories - beforeCalories)).toBeLessThanOrEqual(
      Math.ceil(beforeCalories * 0.15),
    );
  });
});
