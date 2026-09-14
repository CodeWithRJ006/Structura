"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDb = initDb;
exports.getDb = getDb;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../observability/logger");
const defaultDbPath = path_1.default.resolve(__dirname, '..', '..', '..', '..', 'structura.db');
const dbPath = process.env.STRUCTURA_DB_PATH || defaultDbPath;
let db;
function initDb() {
    db = new better_sqlite3_1.default(dbPath);
    logger_1.logger.info(`Initialized SQLite DB at ${dbPath}`);
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
  `);
}
function getDb() {
    if (!db)
        throw new Error("DB not initialized");
    return db;
}
//# sourceMappingURL=db.js.map