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

  it('swaps recipe with a new title, new ingredients, and similar calories', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'swap@example.com');
    const recipeId = await createRecipe(app, token);

    const before = await request(app)
      .get(`/api/recipe/${recipeId}`)
      .set('Authorization', `Bearer ${token}`);

    const firstSwap = await request(app)
      .post(`/api/recipe/${recipeId}/swap`)
      .set('Authorization', `Bearer ${token}`);

    expect(firstSwap.status).toBe(200);
    expect(firstSwap.body.recipe.title).not.toBe(before.body.recipe.title);
    expect(firstSwap.body.recipe.ingredients.map((item: { name: string }) => item.name)).not.toEqual(
      before.body.recipe.ingredients.map((item: { name: string }) => item.name),
    );
    expect(firstSwap.body.recipe.generation_meta.mode).toBe('mock');

    const beforeCalories = before.body.recipe.nutrition.calories;
    const afterCalories = firstSwap.body.recipe.nutrition.calories;
    expect(Math.abs(afterCalories - beforeCalories)).toBeLessThanOrEqual(
      Math.ceil(beforeCalories * 0.15),
    );

    const secondSwap = await request(app)
      .post(`/api/recipe/${firstSwap.body.recipe.id}/swap`)
      .set('Authorization', `Bearer ${token}`);

    expect(secondSwap.status).toBe(200);
    expect(secondSwap.body.recipe.title).not.toBe(firstSwap.body.recipe.title);
    expect(secondSwap.body.recipe.ingredients.map((item: { name: string }) => item.name)).not.toEqual(
      firstSwap.body.recipe.ingredients.map((item: { name: string }) => item.name),
    );
    expect(secondSwap.body.recipe.generation_meta.mode).toBe('mock');
  });
});
