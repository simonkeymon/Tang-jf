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

async function createProfile(app: ReturnType<typeof createTestApp>, token: string) {
  return request(app).put('/api/user/profile').set('Authorization', `Bearer ${token}`).send({
    gender: 'male',
    age: 30,
    height_cm: 175,
    weight_kg: 80,
    goal: 'maintain',
    activity_level: 'moderately_active',
    dietary_restrictions: [],
    allergies: [],
  });
}

describe('Recipe endpoints', () => {
  it('generates a Chinese daily recipe plan within calorie range', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe@example.com');

    await createProfile(app, token);
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12' });

    expect(res.status).toBe(201);
    expect(res.body.recipePlan.meals).toHaveLength(4);
    expect(res.body.recipePlan.meals[0].ingredients[0].name).toMatch(/[\u4e00-\u9fa5]/);
    expect(res.body.recipePlan.total_calories).toBeGreaterThanOrEqual(2440);
    expect(res.body.recipePlan.total_calories).toBeLessThanOrEqual(2982);
  });

  it('returns today recipe after generation', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe-today@example.com');

    await createProfile(app, token);
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);

    const today = new Date().toISOString().slice(0, 10);
    const generateRes = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: today });

    const todayRes = await request(app)
      .get('/api/recipe/today')
      .set('Authorization', `Bearer ${token}`);

    const recipeId = generateRes.body.recipePlan.meals[0].id;
    const recipeRes = await request(app)
      .get(`/api/recipe/${recipeId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(todayRes.status).toBe(200);
    expect(todayRes.body.recipePlan.date).toBe(today);
    expect(recipeRes.status).toBe(200);
    expect(recipeRes.body.recipe.id).toBe(recipeId);
  });

  it('rejects unauthenticated access', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/recipe/generate-daily').send({ date: '2026-04-12' });

    expect(res.status).toBe(401);
  });

  it('avoids allergic ingredients in generated recipes', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe-allergy@example.com');

    await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({
        gender: 'male',
        age: 30,
        height_cm: 175,
        weight_kg: 80,
        goal: 'maintain',
        activity_level: 'moderately_active',
        dietary_restrictions: [],
        allergies: ['鲈鱼', '海鲜'],
      });
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-16' });

    const names = res.body.recipePlan.meals.flatMap(
      (meal: { ingredients: Array<{ name: string }> }) => meal.ingredients.map((item) => item.name),
    );

    expect(names).not.toContain('鲈鱼');
  });
});
