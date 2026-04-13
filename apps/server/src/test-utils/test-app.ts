import type express from 'express';

import { createApp } from '../app.js';

// Lightweight test app bootstrap for integration tests
export function createTestApp(): express.Express {
  return createApp();
}
