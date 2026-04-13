import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const achievements = pgTable('achievements', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
});

export const user_achievements = pgTable('user_achievements', {
  user_id: integer('user_id').references(() => users.id),
  achievement_id: integer('achievement_id').references(() => achievements.id),
  acquired_at: timestamp('acquired_at').defaultNow(),
  // Composite primary key could be added by drizzle if needed
});
