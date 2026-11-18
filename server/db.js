import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

// Parse connection options
// DATABASE_URL is the project's own setting; the Supabase / Neon Vercel integrations set POSTGRES_URL.
const rawConnectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const isLocalDatabase = !rawConnectionString || /@(localhost|127\.0\.0\.1)(:|\/)/.test(rawConnectionString);
const isCloudPostgres = Boolean(rawConnectionString) && !isLocalDatabase;
const isServerless = Boolean(process.env.VERCEL);

// node-postgres treats sslmode=require in the URL as full certificate verification, which
// rejects Supabase's pooler certificate chain. Strip it and configure SSL explicitly instead.
function withoutSslParams(url) {
  try {
    const u = new URL(url);
    ['sslmode', 'sslrootcert', 'sslcert', 'sslkey', 'supa'].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}

const poolConfig = rawConnectionString
  ? {
      connectionString: isCloudPostgres ? withoutSslParams(rawConnectionString) : rawConnectionString,
      ssl: isCloudPostgres ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: isCloudPostgres ? 10000 : 3000,
      // Each serverless instance keeps only a few connections; Supabase's pooler multiplexes them
      max: isServerless ? 3 : 10,
      idleTimeoutMillis: isServerless ? 10000 : 30000,
    }
  : {
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'wad_parking',
      password: process.env.PGPASSWORD || 'postgres',
      port: parseInt(process.env.PGPORT || '5432', 10),
      connectionTimeoutMillis: 3000,
    };

const pgPool = new Pool(poolConfig);

// Handle idle connection errors gracefully without crashing process
pgPool.on('error', (err) => {
  console.warn('[PostgreSQL] Background pool event:', err.message);
});

// ------------------------------------------------------------
// Embedded PostgreSQL fallback (PGlite)
// When no external PostgreSQL server is reachable (e.g. local machine without
// Postgres installed, or a Vercel deployment without DATABASE_URL), the same SQL
// runs against PGlite: real PostgreSQL compiled to WASM, running in-process.
// Locally data persists in server/data/pgdata; on Vercel it lives in memory.
// ------------------------------------------------------------
let activeEngine = 'postgres';
let pglite = null;
let pgliteLock = Promise.resolve();

// PGlite has a single connection, so callers take turns holding it.
function acquirePgliteLock() {
  let release;
  const next = new Promise((resolve) => { release = resolve; });
  const prev = pgliteLock;
  pgliteLock = prev.then(() => next);
  return prev.then(() => release);
}

async function pgliteRun(text, params) {
  if (params && params.length > 0) {
    return pglite.query(text, params);
  }
  // Parameterless calls may hold several statements (schema / migrations)
  const results = await pglite.exec(text);
  const last = results[results.length - 1] || { rows: [], fields: [] };
  return last;
}

function withRowCount(res) {
  // Match node-postgres: rowCount is rows returned for SELECT, rows changed otherwise
  return { ...res, rowCount: res.rows.length || res.affectedRows || 0 };
}

async function startPglite() {
  const { PGlite } = await import('@electric-sql/pglite');
  const dataDir = process.env.VERCEL ? undefined : path.join(__dirname, 'data', 'pgdata');
  pglite = dataDir ? new PGlite(dataDir) : new PGlite();
  await pglite.waitReady;
  activeEngine = 'pglite';
}

export const pool = {
  async query(text, params) {
    if (activeEngine === 'postgres') return pgPool.query(text, params);
    const release = await acquirePgliteLock();
    try {
      return withRowCount(await pgliteRun(text, params));
    } finally {
      release();
    }
  },
  async connect() {
    if (activeEngine === 'postgres') return pgPool.connect();
    const release = await acquirePgliteLock();
    let released = false;
    return {
      query: async (text, params) => withRowCount(await pgliteRun(text, params)),
      release: () => {
        if (!released) {
          released = true;
          release();
        }
      },
    };
  },
  on() {},
};

let postgresConnected = false;
let lastInitError = null;
let schemaWasCurrent = false;

// True once schema.sql and safe-migrate.js have both been applied
async function checkSchemaCurrent() {
  try {
    const res = await pool.query(`
      SELECT
        EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'cancelled_at') AS has_column,
        EXISTS (SELECT 1 FROM pg_indexes
                WHERE schemaname = 'public' AND indexname = 'idx_bookings_idempotency') AS has_index;
    `);
    return Boolean(res.rows[0]?.has_column && res.rows[0]?.has_index);
  } catch {
    return false;
  }
}

export function isSchemaCurrent() {
  return schemaWasCurrent;
}

export function isCloudDatabaseConfigured() {
  return isCloudPostgres;
}

export function getDbInitError() {
  return lastInitError;
}

export function getDbHost() {
  try {
    return rawConnectionString ? new URL(rawConnectionString).hostname : 'localhost';
  } catch {
    return 'unknown';
  }
}

export function getDbEngine() {
  return activeEngine;
}

/**
 * Initialize PostgreSQL Schema & Test Connection
 * Tries the configured PostgreSQL server first, then falls back to embedded PGlite.
 */
export async function initPostgres() {
  try {
    const client = await pgPool.connect();
    const res = await client.query('SELECT NOW() AS now, current_database() AS db');
    client.release();
    activeEngine = 'postgres';
    lastInitError = null;
    console.log(`[PostgreSQL] Connected successfully to database: "${res.rows[0].db}" at ${res.rows[0].now}`);
  } catch (err) {
    const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.warn(`[PostgreSQL] External server unavailable (${msg || 'connection refused'}).`);
    if (isCloudPostgres) {
      // A cloud database (Supabase/Neon) is configured: never fall back to a per-instance
      // in-memory database, or each serverless instance would see different users and bookings.
      lastInitError = msg || 'connection failed';
      postgresConnected = false;
      console.error('[PostgreSQL] Cloud database configured but unreachable; not falling back to embedded engine.');
      return false;
    }
    try {
      await startPglite();
      console.log('[PostgreSQL] Using embedded PostgreSQL engine (PGlite).');
    } catch (pgliteErr) {
      postgresConnected = false;
      console.warn('[PostgreSQL] Embedded engine failed to start:', pgliteErr.message);
      console.warn('[PostgreSQL] Serving from JSON dataset layer (read-only features).');
      return false;
    }
  }

  try {
    // Skip DDL when the schema is already fully migrated: ALTER/CREATE take table locks
    // and would block (or deadlock with) live bookings on every serverless cold start.
    schemaWasCurrent = await checkSchemaCurrent();
    if (schemaWasCurrent) {
      postgresConnected = true;
      console.log('[PostgreSQL] Schema already up to date; skipping migrations.');
      return true;
    }
    // Auto-run schema.sql to ensure all tables exist
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('[PostgreSQL] Database schema validated (7 tables initialized)');
    }
    postgresConnected = true;
    return true;
  } catch (err) {
    postgresConnected = false;
    console.warn('[PostgreSQL] Schema initialization failed:', err.message);
    return false;
  }
}

export function isDbConnected() {
  return postgresConnected;
}

/**
 * Helper to execute parameterized queries safely
 */
export async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Helper for multi-statement ACID transactions
 */
export async function getClient() {
  return pool.connect();
}
