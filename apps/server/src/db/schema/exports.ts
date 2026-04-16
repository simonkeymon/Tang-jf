import { timestamp, pgTable, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const export_history = pgTable('export_history', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  format: varchar('format', { length: 16 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
