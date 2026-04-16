import { integer, pgTable, real, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const summaries = pgTable('summaries', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  meal_completion_rate: real('meal_completion_rate').notNull(),
  actual_calories: integer('actual_calories').notNull(),
  target_calories: integer('target_calories').notNull(),
  calorie_delta: integer('calorie_delta').notNull(),
  weight_kg: real('weight_kg'),
  streak: integer('streak').notNull(),
  ai_feedback: text('ai_feedback').notNull(),
  tomorrow_preview: text('tomorrow_preview').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
