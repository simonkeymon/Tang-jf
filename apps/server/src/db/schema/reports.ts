import { integer, pgTable, real, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const reports = pgTable('reports', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 16 }).notNull(),
  generated_at: timestamp('generated_at').notNull(),
  latest_weight: real('latest_weight'),
  entries_count: integer('entries_count').notNull(),
  execution_rate: real('execution_rate').notNull(),
  actual_calories: integer('actual_calories').notNull(),
  target_calories: integer('target_calories').notNull(),
  ai_summary: text('ai_summary').notNull(),
});
