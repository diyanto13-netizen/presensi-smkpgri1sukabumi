// src/db/index.ts
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';

// Add global connection pool caching to persist across hot-reloads
declare global {
  var _postgresPool: Pool | undefined;
}

// Function to create or retrieve the connection pool.
export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST,
      user: process.env.SQL_USER,
      password: process.env.SQL_PASSWORD,
      database: process.env.SQL_DB_NAME,
      max: 10,
      connectionTimeoutMillis: 15000,
    });

    // Prevent unhandled pool-level errors from crashing the application
    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

// Create or retrieve the pool instance.
const pool = createPool();

// Initialize Drizzle with the pool and schema.
export const db = drizzle(pool, { schema });

// Ensure database columns are synchronized with schema (adds Dzuhur columns and drops Ashar columns)
export const ensureDatabaseSchema = async () => {
  try {
    await pool.query(`
      ALTER TABLE IF EXISTS "school_config"
        ADD COLUMN IF NOT EXISTS "sholat_absen_enabled" boolean DEFAULT true NOT NULL,
        ADD COLUMN IF NOT EXISTS "sholat_dzuhur_mulai" varchar(20) DEFAULT '11:45' NOT NULL,
        ADD COLUMN IF NOT EXISTS "sholat_dzuhur_selesai" varchar(20) DEFAULT '13:15' NOT NULL,
        DROP COLUMN IF EXISTS "sholat_ashar_mulai",
        DROP COLUMN IF EXISTS "sholat_ashar_selesai";

      ALTER TABLE IF EXISTS "attendance"
        ADD COLUMN IF NOT EXISTS "jam_dzuhur" varchar(20),
        ADD COLUMN IF NOT EXISTS "status_dzuhur" varchar(50),
        DROP COLUMN IF EXISTS "jam_ashar",
        DROP COLUMN IF EXISTS "status_ashar";
    `);
  } catch (err) {
    console.warn('Database schema auto-sync warning:', err);
  }
};

