import request from 'supertest';
import { createTestApp } from '../test-app.js';

describe('Health endpoint', () => {
  it('GET /health should return ok and server name', async () => {
    const app = createTestApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      ok: true,
      name: 'tang-server',
      persistence: 'memory',
      engine: 'memory',
    });
  });
});
