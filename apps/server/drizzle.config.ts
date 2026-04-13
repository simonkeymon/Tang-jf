import type { Config } from 'drizzle-kit';

const config: Config = {
  schema: './src/db/schema',
  out: './drizzle/migrations',
  connectionString: process.env.DATABASE_URL,
  driver: 'pglite',
  dialect: 'postgresql',
};

export default config;
