import { pgTable, serial, integer, varchar, date, json, boolean } from 'drizzle-orm/pg-core';
import { plans } from './plans.js';

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  plan_id: integer('plan_id').references(() => plans.id),
  date: date('date'),
  meal_type: varchar('meal_type', { length: 50 }),
  title: varchar('title', { length: 255 }),
  cuisine_type: varchar('cuisine_type', { length: 100 }),
  ingredients: json('ingredients'),
  steps: json('steps'),
  nutrition: json('nutrition'),
  is_favorite: boolean('is_favorite').notNull().default(false),
});
