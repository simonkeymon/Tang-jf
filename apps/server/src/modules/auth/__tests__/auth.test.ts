import request from 'supertest';

import { createTestApp } from '../../../test-utils/test-app.js';

describe('Auth endpoints', () => {
  it('supports first-admin bootstrap only once', async () => {
    const app = createTestApp();

    const statusBefore = await request(app).get('/api/auth/admin-bootstrap/status');
    expect(statusBefore.status).toBe(200);
    expect(statusBefore.body).toEqual({ needsBootstrap: true });

    const bootstrapRes = await request(app).post('/api/auth/admin-bootstrap/register').send({
      email: 'owner@example.com',
      password: 'password123',
    });

    expect(bootstrapRes.status).toBe(201);
    expect(bootstrapRes.body.user).toMatchObject({
      email: 'owner@example.com',
      role: 'admin',
    });

    const statusAfter = await request(app).get('/api/auth/admin-bootstrap/status');
    expect(statusAfter.status).toBe(200);
    expect(statusAfter.body).toEqual({ needsBootstrap: false });

    const secondBootstrap = await request(app).post('/api/auth/admin-bootstrap/register').send({
      email: 'owner2@example.com',
      password: 'password123',
    });

    expect(secondBootstrap.status).toBe(409);
    expect(secondBootstrap.body).toEqual({
      message: 'Admin account has already been initialized',
    });
  });

  it('supports browser CORS requests for auth endpoints', async () => {
    const app = createTestApp();

    const preflightRes = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST')
      .set('Access-Control-Request-Headers', 'content-type,authorization');

    expect(preflightRes.status).toBe(204);
    expect(preflightRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(preflightRes.headers['access-control-allow-methods']).toContain('POST');

    const registerRes = await request(app)
      .post('/api/auth/register')
      .set('Origin', 'http://localhost:5173')
      .send({
        email: 'cors@example.com',
        password: 'password123',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

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
        role: 'user',
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
        role: 'user',
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
        role: 'user',
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
        role: 'user',
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

  it('supports forgot-password and reset-password flow', async () => {
    const app = createTestApp();

    await request(app).post('/api/auth/register').send({
      email: 'reset@example.com',
      password: 'password123',
    });

    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'reset@example.com',
    });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);
    expect(forgotRes.body.resetToken).toEqual(expect.any(String));

    const resetRes = await request(app).post('/api/auth/reset-password').send({
      token: forgotRes.body.resetToken,
      password: 'newpassword123',
    });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body).toEqual({ success: true });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'reset@example.com',
      password: 'newpassword123',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.email).toBe('reset@example.com');
  });
});
