import { integer, jsonb, pgTable, real, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const profiles = pgTable('profiles', {
  user_id: varchar('user_id', { length: 64 })
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  gender: varchar('gender', { length: 10 }).notNull(),
  age: integer('age').notNull(),
  height_cm: real('height_cm').notNull(),
  weight_kg: real('weight_kg').notNull(),
  goal: varchar('goal', { length: 32 }).notNull(),
  activity_level: varchar('activity_level', { length: 32 }).notNull(),
  dietary_restrictions: jsonb('dietary_restrictions').notNull().default([]),
  allergies: jsonb('allergies').notNull().default([]),
});
