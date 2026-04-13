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

describe('Export endpoints', () => {
  it('exports JSON without api key', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'export@example.com');

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

    const res = await request(app)
      .get('/api/export/data?format=json')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.weight_entries).toBeDefined();
    expect(res.body.recipes).toBeDefined();
    expect(res.body.achievements).toBeDefined();
    expect(JSON.stringify(res.body)).not.toContain('api_key');
  });

  it('exports CSV', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'export-csv@example.com');

    const res = await request(app)
      .get('/api/export/data?format=csv')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.text).toContain('section,key,value');
  });
});
