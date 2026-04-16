import { boolean, integer, pgTable, real, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const ai_configs = pgTable('ai_configs', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }),
  scope: varchar('scope', { length: 32 }).notNull(),
  base_url: varchar('base_url', { length: 255 }).notNull(),
  encrypted_api_key: varchar('encrypted_api_key', { length: 1024 }).notNull(),
  model: varchar('model', { length: 255 }).notNull(),
  temperature: real('temperature').notNull(),
  max_tokens: integer('max_tokens').notNull(),
  is_custom: boolean('is_custom').notNull().default(false),
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
});
