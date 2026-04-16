function buildDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !port || !user || !password || !database) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function buildConfig() {
  const url = buildDatabaseUrl();

  return {
    schema: './src/db/schema',
    out: './drizzle/migrations',
    dialect: 'postgresql',
    ...(url ? { dbCredentials: { url } } : {}),
  };
}
