import { integer, jsonb, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const plans = pgTable('plans', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  goal: varchar('goal', { length: 32 }).notNull(),
  duration_days: integer('duration_days').notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  daily_calorie_target: integer('daily_calorie_target').notNull(),
  macro_ratio: jsonb('macro_ratio').notNull(),
  phase_descriptions: jsonb('phase_descriptions').notNull(),
  notes: varchar('notes', { length: 4000 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
