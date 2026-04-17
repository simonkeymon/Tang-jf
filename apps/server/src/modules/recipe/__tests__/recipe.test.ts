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
    expect(res.body.recipePlan.generation_meta.mode).toBe('mock');
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

  it('requires an active plan before generating recipes', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe-needs-plan@example.com');

    await createProfile(app, token);

    const res = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-12' });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ message: '请先生成饮食计划，再生成今日食谱' });
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

    const mealText = res.body.recipePlan.meals
      .flatMap((meal: {
        title: string;
        ingredients: Array<{ name: string }>;
      }) => [meal.title, ...meal.ingredients.map((item) => item.name)])
      .join('|');

    expect(mealText).not.toMatch(/鲈鱼|三文鱼|鳕鱼|鱼片|鱼柳|鱼肉|海鲜|虾仁/);
  });

  it('respects dietary restrictions like fish avoidance', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe-restriction@example.com');

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
        dietary_restrictions: ['鱼'],
        allergies: [],
      });
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-16' });

    const mealText = res.body.recipePlan.meals
      .flatMap((meal: {
        title: string;
        ingredients: Array<{ name: string }>;
        steps: Array<{ instruction: string }>;
      }) => [meal.title, ...meal.ingredients.map((item) => item.name), ...meal.steps.map((step) => step.instruction)])
      .join('|');

    expect(mealText).not.toMatch(/鲈鱼|三文鱼|鳕鱼|鱼片|鱼柳|鱼肉|清蒸鱼|煎鱼|烤鱼/);
  });

  it('supports grouped restriction phrases like 葱姜蒜', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'recipe-allium@example.com');

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
        dietary_restrictions: ['不吃葱姜蒜'],
        allergies: [],
      });
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .post('/api/recipe/generate-daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2026-04-16' });

    const mealText = res.body.recipePlan.meals
      .flatMap((meal: {
        title: string;
        ingredients: Array<{ name: string }>;
        steps: Array<{ instruction: string }>;
      }) => [meal.title, ...meal.ingredients.map((item) => item.name), ...meal.steps.map((step) => step.instruction)])
      .join('|');

    expect(mealText).not.toMatch(/葱|姜片|姜末|大蒜|蒜末/);
  });

  it('changes meal choices for different user goals', async () => {
    const app = createTestApp();
    const loseToken = await registerAndGetToken(app, 'recipe-lose@example.com');
    const gainToken = await registerAndGetToken(app, 'recipe-gain@example.com');

    await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${loseToken}`)
      .send({
        gender: 'male',
        age: 30,
        height_cm: 175,
        weight_kg: 80,
        goal: 'lose',
        activity_level: 'moderately_active',
        dietary_restrictions: [],
        allergies: [],
      });
    await request(app)
      .put('/api/user/profile')
      .set('Authorization', `Bearer ${gainToken}`)
      .send({
        gender: 'male',
        age: 30,
        height_cm: 175,
        weight_kg: 80,
        goal: 'gain',
        activity_level: 'moderately_active',
        dietary_restrictions: [],
        allergies: [],
      });

    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${loseToken}`);
    await request(app).post('/api/plan/generate').set('Authorization', `Bearer ${gainToken}`);

    const [loseRes, gainRes] = await Promise.all([
      request(app)
        .post('/api/recipe/generate-daily')
        .set('Authorization', `Bearer ${loseToken}`)
        .send({ date: '2026-04-16' }),
      request(app)
        .post('/api/recipe/generate-daily')
        .set('Authorization', `Bearer ${gainToken}`)
        .send({ date: '2026-04-16' }),
    ]);

    expect(loseRes.body.recipePlan.meals.map((meal: { title: string }) => meal.title)).not.toEqual(
      gainRes.body.recipePlan.meals.map((meal: { title: string }) => meal.title),
    );
  });
});
