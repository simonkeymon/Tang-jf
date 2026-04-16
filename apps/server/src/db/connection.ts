import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const DB_DIRNAME = path.dirname(fileURLToPath(import.meta.url));
const SERVER_ROOT = path.resolve(DB_DIRNAME, '..', '..');

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

  const migrationsFolder = path.resolve(SERVER_ROOT, 'drizzle/migrations');

  if (config.engine === 'pg') {
    await withDatabaseRetry(() =>
      migratePg(db as ReturnType<typeof drizzlePg>, { migrationsFolder }),
    );
  } else if (config.engine === 'pglite') {
    await migratePglite(db as ReturnType<typeof drizzlePglite>, { migrationsFolder });
  }

  migrated = true;
}

export async function resetDatabaseConnectionsForTests(): Promise<void> {
  database = null;
  migrated = false;

  if (pool) {
    await pool.end();
    pool = null;
  }

  if (pglite) {
    await pglite.close();
    pglite = null;
  }
}

export function resolveDefaultPgliteDataDir(cwd: string = process.cwd()): string {
  const explicitDataDir = process.env.PGLITE_DATA_DIR?.trim();
  if (explicitDataDir) {
    return path.isAbsolute(explicitDataDir)
      ? explicitDataDir
      : path.resolve(cwd, explicitDataDir);
  }

  const xdgDataHome = process.env.XDG_DATA_HOME?.trim();
  const preferredBaseDir = xdgDataHome
    ? path.resolve(xdgDataHome, 'tang')
    : path.resolve(os.homedir(), '.tang');
  const preferredDataDir = path.resolve(preferredBaseDir, 'pglite');
  const legacyCandidates = [
    path.resolve(cwd, '.data/pglite'),
    path.resolve(SERVER_ROOT, '.data/pglite'),
  ];
  const legacyDataDir = legacyCandidates.find((candidate) => fs.existsSync(candidate));

  if (!fs.existsSync(preferredDataDir) && legacyDataDir) {
    fs.mkdirSync(preferredBaseDir, { recursive: true });
    fs.cpSync(legacyDataDir, preferredDataDir, { recursive: true });
  }

  return preferredDataDir;
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

  return {
    engine: 'pglite',
    pgliteDataDir: resolveDefaultPgliteDataDir(),
  };
}

function shouldUseMemoryOnly(): boolean {
  const persistenceMode = process.env.PERSISTENCE_MODE?.trim().toLowerCase();
  if (persistenceMode === 'memory') {
    return true;
  }

  if (persistenceMode === 'pglite' || persistenceMode === 'pg') {
    return false;
  }

  return process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
}

async function withDatabaseRetry<T>(operation: () => Promise<T>): Promise<T> {
  const attempts = Math.max(1, Number(process.env.DB_CONNECT_RETRIES ?? 10));
  const delayMs = Math.max(100, Number(process.env.DB_CONNECT_DELAY_MS ?? 1500));
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
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
