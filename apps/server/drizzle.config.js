module.exports = {
  schema: './src/db/schema',
  out: './drizzle/migrations',
  connectionString: process.env.DATABASE_URL,
  driver: 'pglite',
  dialect: 'postgresql',
};
