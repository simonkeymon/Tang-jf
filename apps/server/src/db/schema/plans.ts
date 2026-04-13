import { pgTable, serial, integer, varchar, timestamp, json } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const plans = pgTable('plans', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  goal: varchar('goal', { length: 255 }),
  duration_days: integer('duration_days'),
  status: varchar('status', { length: 50 }),
  ai_config_snapshot: json('ai_config_snapshot'),
  created_at: timestamp('created_at').defaultNow(),
});
