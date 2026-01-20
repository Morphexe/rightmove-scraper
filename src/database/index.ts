import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { getConfig } from '../config/index.js';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle> | null = null;
let pool: mysql.Pool | null = null;

export async function getDb() {
  if (!db) {
    const config = getConfig();
    pool = mysql.createPool(config.DATABASE_URL);
    db = drizzle(pool, { schema, mode: 'default' });
  }
  return db;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}

export { schema };
