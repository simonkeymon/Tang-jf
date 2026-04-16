import type express from 'express';

import { createAppSync } from '../app.js';

// Lightweight test app bootstrap for integration tests
export function createTestApp(): express.Express {
  return createAppSync();
}
