import { timestamp, pgTable, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const refresh_tokens = pgTable('refresh_tokens', {
  token: varchar('token', { length: 1024 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const password_reset_tokens = pgTable('password_reset_tokens', {
  token: varchar('token', { length: 128 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires_at: timestamp('expires_at').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
