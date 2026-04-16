import fs from 'node:fs';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { migrate as migratePg } from 'drizzle-orm/node-postgres/migrator';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { Pool } from 'pg';

type PersistenceEngine = 'memory' | 'pg' | 'pglite';
type DatabaseInstance = ReturnType<typeof drizzlePg> | ReturnType<typeof drizzlePglite> | null;

let pool: Pool | null = null;
let pglite: PGlite | null = null;
let database: DatabaseInstance = null;
let migrated = false;

export function isDatabaseEnabled(): boolean {
  return resolvePersistenceConfig().engine !== 'memory';
}

export function getPersistenceInfo(): {
  persistence: 'memory' | 'postgres';
  engine: PersistenceEngine;
} {
  const engine = resolvePersistenceConfig().engine;
  return {
    persistence: engine === 'memory' ? 'memory' : 'postgres',
    engine,
  };
}

export function getDb() {
  const config = resolvePersistenceConfig();

  if (config.engine === 'memory') {
    return null;
  }

  if (database) {
    return database;
  }

  if (config.engine === 'pg' && config.connectionString) {
    pool = new Pool({ connectionString: config.connectionString });
    database = drizzlePg(pool);
    return database;
  }

  if (config.engine === 'pglite' && config.pgliteDataDir) {
    fs.mkdirSync(config.pgliteDataDir, { recursive: true });
    pglite = new PGlite(config.pgliteDataDir);
    database = drizzlePglite(pglite);
    return database;
  }

  return null;
}

export async function runDatabaseMigrations(): Promise<void> {
  const config = resolvePersistenceConfig();
  if (config.engine === 'memory' || migrated) {
    return;
  }

  const db = getDb();
  if (!db) {
    return;
  }

  const migrationsFolder = path.resolve(process.cwd(), 'drizzle/migrations');

  if (config.engine === 'pg') {
    await migratePg(db as ReturnType<typeof drizzlePg>, { migrationsFolder });
  } else if (config.engine === 'pglite') {
    await migratePglite(db as ReturnType<typeof drizzlePglite>, { migrationsFolder });
  }

  migrated = true;
}

function resolvePersistenceConfig(): {
  engine: PersistenceEngine;
  connectionString?: string;
  pgliteDataDir?: string;
} {
  const connectionString = getConnectionString();
  if (connectionString) {
    return {
      engine: 'pg',
      connectionString,
    };
  }

  if (shouldUseMemoryOnly()) {
    return { engine: 'memory' };
  }

  const dataDir = process.env.PGLITE_DATA_DIR
    ? path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR)
    : path.resolve(process.cwd(), '.data/pglite');

  return {
    engine: 'pglite',
    pgliteDataDir: dataDir,
  };
}

function shouldUseMemoryOnly(): boolean {
  if (process.env.PERSISTENCE_MODE === 'memory') {
    return true;
  }

  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

function getConnectionString(): string | null {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const databaseName = process.env.DB_NAME;

  if (!host || !port || !user || !password || !databaseName) {
    return null;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${databaseName}`;
}
