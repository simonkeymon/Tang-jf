import { pgTable, serial, integer, varchar, boolean, text, json } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const ai_configs = pgTable('ai_configs', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  base_url: varchar('base_url', { length: 255 }),
  encrypted_api_key: varchar('encrypted_api_key', { length: 512 }),
  model: varchar('model', { length: 100 }),
  is_custom: boolean('is_custom').notNull().default(false),
});
