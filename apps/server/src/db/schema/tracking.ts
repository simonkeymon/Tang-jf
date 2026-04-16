import { pgTable, real, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const weight_entries = pgTable('weight_entries', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  weight_kg: real('weight_kg').notNull(),
  note: varchar('note', { length: 1000 }),
});

export const meal_check_ins = pgTable('meal_check_ins', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: varchar('date', { length: 10 }).notNull(),
  meal_type: varchar('meal_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
});
