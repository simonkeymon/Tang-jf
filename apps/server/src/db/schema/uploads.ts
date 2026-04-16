import { timestamp, pgTable, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const uploads = pgTable('uploads', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 }).references(() => users.id, { onDelete: 'cascade' }),
  filename: varchar('filename', { length: 255 }).notNull(),
  relative_path: varchar('relative_path', { length: 2048 }).notNull(),
  url: varchar('url', { length: 2048 }).notNull(),
  mime_type: varchar('mime_type', { length: 128 }).notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});
