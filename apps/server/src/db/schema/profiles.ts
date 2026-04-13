import { pgTable, integer, varchar, date, json } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const profiles = pgTable('profiles', {
  user_id: integer('user_id').references(() => users.id),
  gender: varchar('gender', { length: 10 }),
  age: integer('age'),
  height_cm: integer('height_cm'),
  weight_kg: integer('weight_kg'),
  goal: varchar('goal', { length: 255 }),
  dietary_restrictions: json('dietary_restrictions'),
  allergies: json('allergies'),
  // You can optionally add created_at/updated_at for tracking
});
