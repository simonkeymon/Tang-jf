import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

import request from 'supertest';
import sharp from 'sharp';

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

async function createImageFile(filename: string, size = 100) {
  const filePath = path.join(os.tmpdir(), filename);
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer();

  await writeFile(filePath, buffer);
  return filePath;
}

describe('Upload endpoints', () => {
  it('uploads an image for an authenticated user', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'upload@example.com');
    const imagePath = await createImageFile('tang-upload-test.jpg');

    const res = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', imagePath);

    expect(res.status).toBe(200);
    expect(res.body.file.url).toContain('/uploads/');
    expect(res.body.file.filename).toMatch(/\.jpg$/);
  });

  it('rejects unauthenticated upload requests', async () => {
    const app = createTestApp();
    const imagePath = await createImageFile('tang-upload-unauth.jpg');

    const res = await request(app).post('/api/upload/image').attach('image', imagePath);

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: 'Authentication required' });
  });

  it('rejects unsupported file types', async () => {
    const app = createTestApp();
    const token = await registerAndGetToken(app, 'upload2@example.com');
    const textPath = path.join(os.tmpdir(), 'tang-upload.txt');
    await writeFile(textPath, 'not-an-image');

    const res = await request(app)
      .post('/api/upload/image')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', textPath);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: 'Unsupported file type' });
  });
});
