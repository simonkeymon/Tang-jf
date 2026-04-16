import { integer, pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const food_analyses = pgTable('food_analyses', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  image_url: varchar('image_url', { length: 2048 }).notNull(),
  total_calories: integer('total_calories').notNull(),
  confidence: varchar('confidence', { length: 16 }).notNull(),
  note: text('note'),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const food_analysis_items = pgTable('food_analysis_items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  analysis_id: varchar('analysis_id', { length: 64 })
    .notNull()
    .references(() => food_analyses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  estimated_portion: varchar('estimated_portion', { length: 255 }).notNull(),
  estimated_calories: integer('estimated_calories').notNull(),
});
