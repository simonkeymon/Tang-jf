import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import request from 'supertest';

import { createApp } from '../../app.js';
import {
  getPersistenceInfo,
  resetDatabaseConnectionsForTests,
  resolveDefaultPgliteDataDir,
  runDatabaseMigrations,
} from '../connection.js';

describe('database persistence configuration', () => {
  const originalEnv = { ...process.env };
  let tempDataDir: string | null = null;

  afterEach(async () => {
    process.env = { ...originalEnv };
    await resetDatabaseConnectionsForTests();
    if (tempDataDir) {
      fs.rmSync(tempDataDir, { recursive: true, force: true });
      tempDataDir = null;
    }
  });

  it('uses a durable home-directory pglite path by default', () => {
    delete process.env.PGLITE_DATA_DIR;
    delete process.env.XDG_DATA_HOME;

    const resolved = resolveDefaultPgliteDataDir('/tmp/tang-project');

    expect(resolved).toBe(path.resolve(os.homedir(), '.tang', 'pglite'));
  });

  it('prefers PostgreSQL when DATABASE_URL is configured', () => {
    process.env.PERSISTENCE_MODE = 'pg';
    process.env.DATABASE_URL = 'postgresql://tang:tang@127.0.0.1:5432/tang';

    expect(getPersistenceInfo()).toEqual({
      persistence: 'postgres',
      engine: 'pg',
    });
  });

  it('keeps auth data after recreating the app with file-backed pglite', async () => {
    tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tang-pglite-'));
    process.env.PERSISTENCE_MODE = 'pglite';
    process.env.PGLITE_DATA_DIR = tempDataDir;
    delete process.env.DATABASE_URL;

    await runDatabaseMigrations();
    const firstApp = await createApp();

    const bootstrapRes = await request(firstApp).post('/api/auth/admin-bootstrap/register').send({
      email: 'owner@example.com',
      password: 'password123',
    });
    expect(bootstrapRes.status).toBe(201);

    const registerRes = await request(firstApp).post('/api/auth/register').send({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(registerRes.status).toBe(201);

    await resetDatabaseConnectionsForTests();
    await runDatabaseMigrations();
    const secondApp = await createApp();

    const statusRes = await request(secondApp).get('/api/auth/admin-bootstrap/status');
    expect(statusRes.status).toBe(200);
    expect(statusRes.body).toEqual({ needsBootstrap: false });

    const loginRes = await request(secondApp).post('/api/auth/login').send({
      email: 'user@example.com',
      password: 'password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user).toMatchObject({
      email: 'user@example.com',
      role: 'user',
    });
  });
});
