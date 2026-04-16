import request from 'supertest';

import { createTestApp } from '../../../test-utils/test-app.js';
import { createAIConfigService } from '../ai-config.service.js';

async function registerAndGetToken(
  app: ReturnType<typeof createTestApp>,
  email: string,
): Promise<string> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123' });

  return res.body.accessToken as string;
}

const VALID_CONFIG = {
  base_url: 'https://api.openai.com/v1',
  api_key: 'sk-abcdef1234567890',
  model: 'gpt-4o',
  temperature: 0.2,
  max_tokens: 512,
  is_custom: true,
};

describe('AI config endpoints', () => {
  it('preserves existing api key when saving updated model with empty api_key', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'preserve@example.com');

    await request(app)
      .put('/api/ai/config')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_CONFIG);

    const updateRes = await request(app)
      .put('/api/ai/config')
      .set('Authorization', `Bearer ${token}`)
      .send({
        ...VALID_CONFIG,
        api_key: '',
        model: 'gpt-4.1-mini',
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.config.model).toBe('gpt-4.1-mini');
    expect(updateRes.body.config.api_key).toBe('sk-a***7890');
  });

  it('stores encrypted user config and returns masked key', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'user@example.com');

    const putRes = await request(app)
      .put('/api/ai/config')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_CONFIG);

    expect(putRes.status).toBe(200);
    expect(putRes.body.config.api_key).toBe('sk-a***7890');
    expect(putRes.body.config.api_key).not.toBe(VALID_CONFIG.api_key);

    const getRes = await request(app).get('/api/ai/config').set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.config).toMatchObject({
      base_url: VALID_CONFIG.base_url,
      model: VALID_CONFIG.model,
      temperature: VALID_CONFIG.temperature,
      max_tokens: VALID_CONFIG.max_tokens,
      is_custom: true,
      api_key: 'sk-a***7890',
    });
  });

  it('allows admin to manage platform config', async () => {
    const app = createTestApp();
    const adminToken = await registerAndGetToken(app, 'admin@example.com');

    const putRes = await request(app)
      .put('/api/admin/ai/config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ...VALID_CONFIG, is_custom: false });

    expect(putRes.status).toBe(200);
    expect(putRes.body.config.api_key).toBe('sk-a***7890');
    expect(putRes.body.config.is_custom).toBe(false);

    const getRes = await request(app)
      .get('/api/admin/ai/config')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.config.model).toBe('gpt-4o');
    expect(getRes.body.config.api_key).toBe('sk-a***7890');
  });

  it('rejects non-admin access to admin config endpoints', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'regular@example.com');

    const getRes = await request(app)
      .get('/api/admin/ai/config')
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.status).toBe(403);
    expect(getRes.body).toEqual({ message: 'Admin access required' });

    const putRes = await request(app)
      .put('/api/admin/ai/config')
      .set('Authorization', `Bearer ${token}`)
      .send(VALID_CONFIG);

    expect(putRes.status).toBe(403);
    expect(putRes.body).toEqual({ message: 'Admin access required' });
  });
});

describe('AI config runtime resolution', () => {
  it('prefers user custom config and falls back to platform config', () => {
    const service = createAIConfigService({ encryptionSecret: 'test-secret' });

    service.setPlatformConfig({
      base_url: 'https://platform.example.com/v1',
      api_key: 'platform-secret',
      model: 'platform-model',
      temperature: 0.3,
      max_tokens: 600,
      is_custom: false,
    });

    expect(service.getRuntimeConfigForUser('user-1')).toMatchObject({
      provider: 'openai-compatible',
      baseUrl: 'https://platform.example.com/v1',
      apiKey: 'platform-secret',
      model: 'platform-model',
    });

    service.setUserConfig('user-1', {
      base_url: 'https://user.example.com/v1',
      api_key: 'user-secret',
      model: 'user-model',
      temperature: 0.1,
      max_tokens: 700,
      is_custom: true,
    });

    expect(service.getRuntimeConfigForUser('user-1')).toMatchObject({
      provider: 'openai-compatible',
      baseUrl: 'https://user.example.com/v1',
      apiKey: 'user-secret',
      model: 'user-model',
    });
  });
});
