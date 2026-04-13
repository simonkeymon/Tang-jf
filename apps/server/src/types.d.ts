/// <reference types="vitest/globals" />

import type { AuthenticatedUser } from './modules/auth/auth.service.js';

// Lightweight ambient declarations to satisfy TS in this environment where
// full type packages may not be resolved during initial scaffold wiring.
declare module 'pg';
declare module 'drizzle-orm/pg-core';
declare module 'drizzle-orm/node-postgres';
declare module 'drizzle-kit';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
