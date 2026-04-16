import { boolean, integer, jsonb, pgTable, varchar } from 'drizzle-orm/pg-core';

import { plans } from './plans.js';

export const recipes = pgTable('recipes', {
  id: varchar('id', { length: 64 }).primaryKey(),
  plan_id: varchar('plan_id', { length: 64 })
    .notNull()
    .references(() => plans.id, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  meal_type: varchar('meal_type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  cuisine_type: varchar('cuisine_type', { length: 100 }).notNull(),
  ingredients: jsonb('ingredients').notNull(),
  steps: jsonb('steps').notNull(),
  nutrition: jsonb('nutrition').notNull(),
  cook_time_minutes: integer('cook_time_minutes').notNull(),
  is_favorite: boolean('is_favorite').notNull().default(false),
});
