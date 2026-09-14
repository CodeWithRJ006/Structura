import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../observability/logger';

const defaultDbPath = path.resolve(__dirname, '..', '..', '..', '..', 'structura.db');
const dbPath = process.env.STRUCTURA_DB_PATH || defaultDbPath;
let db: Database.Database;

export function initDb() {
  db = new Database(dbPath);
  logger.info(`Initialized SQLite DB at ${dbPath}`);

  // Create table idempotently
  db.exec(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      tool TEXT NOT NULL,
      args_json TEXT NOT NULL,
      raw_request TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      result_json TEXT,
      created_at INTEGER NOT NULL,
      resolved_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      seq INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      tool TEXT NOT NULL,
      decision TEXT NOT NULL,
      source TEXT NOT NULL,
      reason TEXT,
      args_summary TEXT NOT NULL,
      prev_hash TEXT NOT NULL,
      entry_hash TEXT NOT NULL
    );
  `);
}

export function getDb() {
  if (!db) throw new Error("DB not initialized");
  return db;
}
