import request from 'supertest';

import { createTestApp } from '../../../test-utils/test-app.js';

describe('Auth endpoints', () => {
  it('POST /api/auth/register registers a user', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        id: expect.any(String),
        email: 'user@example.com',
      },
    });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('POST /api/auth/register rejects a weak password', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: '123',
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('Invalid request body');
    expect(res.body.errors).toContainEqual({
      field: 'password',
      message: 'Password must be at least 8 characters',
    });
  });

  it('POST /api/auth/login returns an access token after register', async () => {
    const app = createTestApp();

    await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      user: {
        id: expect.any(String),
        email: 'user@example.com',
      },
    });
  });

  it('GET /api/auth/me returns the current user for a valid token', async () => {
    const app = createTestApp();

    await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      user: {
        id: loginRes.body.user.id,
        email: 'user@example.com',
      },
    });
  });

  it('GET /api/auth/me without a token returns 401', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Authentication required' });
  });

  it('GET /api/auth/me with an invalid token returns 401', async () => {
    const app = createTestApp();

    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid access token' });
  });

  it('POST /api/auth/refresh returns a new access token for a valid refresh token', async () => {
    const app = createTestApp();

    const registerRes = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: registerRes.body.refreshToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      accessToken: expect.any(String),
      user: {
        id: registerRes.body.user.id,
        email: 'user@example.com',
      },
    });
    expect(res.body.accessToken).not.toBe(registerRes.body.accessToken);
  });

  it('POST /api/auth/refresh rejects an invalid refresh token', async () => {
    const app = createTestApp();

    const res = await request(app).post('/api/auth/refresh').send({
      refreshToken: 'invalid-refresh-token',
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Invalid refresh token' });
  });

  it('POST /api/auth/logout invalidates the refresh token', async () => {
    const app = createTestApp();

    const loginRes = await request(app).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });

    const logoutRes = await request(app).post('/api/auth/logout').send({
      refreshToken: loginRes.body.refreshToken,
    });

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body).toEqual({ success: true });

    const refreshRes = await request(app).post('/api/auth/refresh').send({
      refreshToken: loginRes.body.refreshToken,
    });

    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body).toEqual({ message: 'Invalid refresh token' });
  });
});
