import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Read DB connection info from environment variables and export a reusable drizzle/db instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);
export default db;
