import { pgTable, varchar, text, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const achievements = pgTable('achievements', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at').defaultNow(),
});

export const user_achievements = pgTable('user_achievements', {
  user_id: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }),
  achievement_id: varchar('achievement_id', { length: 64 }).references(() => achievements.id, {
    onDelete: 'cascade',
  }),
  acquired_at: timestamp('acquired_at').defaultNow(),
});
