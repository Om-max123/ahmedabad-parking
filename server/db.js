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
const connectionString = process.env.DATABASE_URL;
const isCloudPostgres = connectionString && (
  connectionString.includes('supabase') || 
  connectionString.includes('neon.tech') || 
  connectionString.includes('render.com') ||
  connectionString.includes('railway') ||
  connectionString.includes('sslmode=require')
);

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: isCloudPostgres ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 3000,
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
    console.log(`[PostgreSQL] Connected successfully to database: "${res.rows[0].db}" at ${res.rows[0].now}`);
  } catch (err) {
    const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.warn(`[PostgreSQL] External server unavailable (${msg || 'connection refused'}).`);
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
