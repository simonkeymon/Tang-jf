import { pgTable, serial, integer, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const shopping_lists = pgTable('shopping_lists', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').references(() => users.id),
  name: varchar('name', { length: 255 }),
  created_at: timestamp('created_at').defaultNow(),
});

export const shopping_items = pgTable('shopping_items', {
  id: serial('id').primaryKey(),
  list_id: integer('list_id').references(() => shopping_lists.id),
  product: varchar('product', { length: 255 }),
  quantity: varchar('quantity', { length: 50 }),
  acquired: boolean('acquired').notNull().default(false),
});
