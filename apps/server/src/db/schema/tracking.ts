import { pgTable, integer, date, numeric, boolean, json } from 'drizzle-orm/pg-core';
import { users } from './users.js';
import { plans } from './plans.js';

export const weight_entries = pgTable('weight_entries', {
  id: integer('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  date: date('date').notNull(),
  weight_kg: numeric('weight_kg', { precision: 5, scale: 2 }).notNull(),
});

export const meal_check_ins = pgTable('meal_check_ins', {
  id: integer('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  date: date('date').notNull(),
  meals: json('meals'),
});
