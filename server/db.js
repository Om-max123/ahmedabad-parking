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

export const pool = new Pool(poolConfig);

// Handle idle connection errors gracefully without crashing process
pool.on('error', (err) => {
  console.warn('[PostgreSQL] Background pool event:', err.message);
});

let postgresConnected = false;

/**
 * Initialize PostgreSQL Schema & Test Connection
 */
export async function initPostgres() {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS now, current_database() AS db');
    client.release();
    postgresConnected = true;
    console.log(`[PostgreSQL] Connected successfully to database: "${res.rows[0].db}" at ${res.rows[0].now}`);

    // Auto-run schema.sql to ensure all 5 tables exist
    const schemaPath = path.join(__dirname, 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      await pool.query(schemaSql);
      console.log('[PostgreSQL] Database schema validated (5 tables initialized: locations, users, parking_slots, bookings, receipts)');
    }
    return true;
  } catch (err) {
    postgresConnected = false;
    const msg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    console.warn('[PostgreSQL] Notice: PostgreSQL server not currently active on port 5432 or invalid credentials.');
    console.warn(`[PostgreSQL] Diagnostic: ${msg || 'Connection timed out or server unavailable'}`);
    console.warn('[PostgreSQL] Seamless Dual-Engine: Serving from JSON dataset layer with full CRUD support.');
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
