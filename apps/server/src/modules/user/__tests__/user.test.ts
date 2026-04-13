import request from 'supertest';

import { createTestApp } from '../../../test-utils/test-app.js';

const VALID_PROFILE = {
  gender: 'male',
  age: 30,
  height_cm: 175,
  weight_kg: 80,
  goal: 'maintain',
  activity_level: 'moderately_active',
  dietary_restrictions: ['vegetarian'],
  allergies: ['peanuts'],
};

async function registerAndGetToken(app: ReturnType<typeof createTestApp>): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email: `user-${Date.now()}@example.com`,
      password: 'password123',
    });

  return res.body.accessToken as string;
}

describe('User Profile endpoints', () => {
  describe('PUT /api/user/profile', () => {
    it('creates a profile and returns it with computed fields', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject(VALID_PROFILE);
      expect(res.body.profile.bmr).toEqual(expect.any(Number));
      expect(res.body.profile.tdee).toEqual(expect.any(Number));
      expect(res.body.profile.daily_calorie_target).toEqual(expect.any(Number));

      // Mifflin-St Jeor male: 10*80 + 6.25*175 - 5*30 + 5 = 1749
      expect(res.body.profile.bmr).toBe(1749);
      // 1749 * 1.55 (moderately_active) = 2711
      expect(res.body.profile.tdee).toBe(2711);
      expect(res.body.profile.daily_calorie_target).toBe(2711);
    });

    it('rejects unauthenticated request with 401', async () => {
      const app = createTestApp();

      const res = await request(app).put('/api/user/profile').send(VALID_PROFILE);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });

    it('rejects invalid profile data with 400', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          gender: 'unknown',
          age: 200,
          height_cm: 10,
          weight_kg: 5,
          goal: 'fly',
          activity_level: 'super_active',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid request body');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'gender' }),
          expect.objectContaining({ field: 'age' }),
          expect.objectContaining({ field: 'height_cm' }),
          expect.objectContaining({ field: 'weight_kg' }),
          expect.objectContaining({ field: 'goal' }),
          expect.objectContaining({ field: 'activity_level' }),
        ]),
      );
    });

    it('rejects empty body with 400', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid request body');
    });
  });

  describe('GET /api/user/profile', () => {
    it('returns the stored profile with computed BMR, TDEE, and daily_calorie_target', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.profile).toMatchObject(VALID_PROFILE);
      expect(res.body.profile.bmr).toBe(1749);
      expect(res.body.profile.tdee).toBe(2711);
      expect(res.body.profile.daily_calorie_target).toBe(2711);
    });

    it('returns 404 when no profile exists', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const res = await request(app)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Profile not found');
    });

    it('rejects unauthenticated request with 401', async () => {
      const app = createTestApp();

      const res = await request(app).get('/api/user/profile');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });
  });

  describe('PATCH /api/user/profile', () => {
    it('partially updates an existing profile', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      const res = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ weight_kg: 75, goal: 'lose' });

      expect(res.status).toBe(200);
      expect(res.body.profile.weight_kg).toBe(75);
      expect(res.body.profile.goal).toBe('lose');
      expect(res.body.profile.gender).toBe('male');
      expect(res.body.profile.age).toBe(30);
      expect(res.body.profile.height_cm).toBe(175);
      // Mifflin-St Jeor male 75kg: 10*75 + 6.25*175 - 5*30 + 5 = 1699
      expect(res.body.profile.bmr).toBe(1699);
      // 1699 * 1.55 = 2633, then lose offset -500
      expect(res.body.profile.tdee).toBe(2633);
      expect(res.body.profile.daily_calorie_target).toBe(2133);
    });

    it('returns 404 when patching a non-existent profile', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const res = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ weight_kg: 75 });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Profile not found');
    });

    it('rejects invalid patch data with 400', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      const res = await request(app)
        .patch('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({ age: -5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid request body');
    });

    it('rejects unauthenticated request with 401', async () => {
      const app = createTestApp();

      const res = await request(app).patch('/api/user/profile').send({ weight_kg: 75 });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Authentication required');
    });
  });

  describe('PATCH /api/user/allergies and /api/user/restrictions', () => {
    it('updates allergies and stores them on the profile', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      const res = await request(app)
        .patch('/api/user/allergies')
        .set('Authorization', `Bearer ${token}`)
        .send({ allergies: ['鲈鱼', '海鲜'] });

      expect(res.status).toBe(200);
      expect(res.body.profile.allergies).toEqual(['鲈鱼', '海鲜']);
    });

    it('updates dietary restrictions and stores them on the profile', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(VALID_PROFILE);

      const res = await request(app)
        .patch('/api/user/restrictions')
        .set('Authorization', `Bearer ${token}`)
        .send({ dietary_restrictions: ['halal', 'low_sugar'] });

      expect(res.status).toBe(200);
      expect(res.body.profile.dietary_restrictions).toEqual(['halal', 'low_sugar']);
    });
  });

  describe('BMR/TDEE calculation correctness', () => {
    it('calculates correctly for female profile with weight-loss goal', async () => {
      const app = createTestApp();
      const token = await registerAndGetToken(app);

      const femaleProfile = {
        gender: 'female',
        age: 25,
        height_cm: 165,
        weight_kg: 60,
        goal: 'lose',
        activity_level: 'lightly_active',
      };

      const res = await request(app)
        .put('/api/user/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(femaleProfile);

      expect(res.status).toBe(200);
      // Mifflin-St Jeor female: 10*60 + 6.25*165 - 5*25 - 161 = 1345
      expect(res.body.profile.bmr).toBe(1345);
      // 1345 * 1.375 (lightly_active) = 1849, lose offset -500
      expect(res.body.profile.tdee).toBe(1849);
      expect(res.body.profile.daily_calorie_target).toBe(1349);
    });
  });
});
