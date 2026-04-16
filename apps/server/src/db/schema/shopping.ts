import { boolean, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const shopping_lists = pgTable('shopping_lists', {
  id: varchar('id', { length: 64 }).primaryKey(),
  user_id: varchar('user_id', { length: 64 })
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  days: integer('days').notNull(),
  created_at: timestamp('created_at').notNull().defaultNow(),
});

export const shopping_items = pgTable('shopping_items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  list_id: varchar('list_id', { length: 64 })
    .notNull()
    .references(() => shopping_lists.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  total_quantity: varchar('total_quantity', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  purchased: boolean('purchased').notNull().default(false),
  staple: boolean('staple').notNull().default(false),
});
