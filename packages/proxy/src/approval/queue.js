"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertPending = insertPending;
exports.getPending = getPending;
exports.getApproval = getApproval;
exports.resolveApproval = resolveApproval;
exports.getStats = getStats;
const db_1 = require("./db");
const uuid_1 = require("uuid");
function insertPending(tool, args, rawRequest, source, reason) {
    const id = (0, uuid_1.v4)();
    const stmt = (0, db_1.getDb)().prepare(`
    INSERT INTO approvals (id, tool, args_json, raw_request, source, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
    stmt.run(id, tool, JSON.stringify(args), rawRequest, source, reason, Date.now());
    return id;
}
function getPending() {
    return (0, db_1.getDb)().prepare(`SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC`).all();
}
function getApproval(id) {
    return (0, db_1.getDb)().prepare(`SELECT * FROM approvals WHERE id = ?`).get(id);
}
function resolveApproval(id, status, resultJson) {
    const stmt = (0, db_1.getDb)().prepare(`
    UPDATE approvals 
    SET status = ?, result_json = ?, resolved_at = ? 
    WHERE id = ? AND status = 'pending'
  `);
    const res = stmt.run(status, resultJson || null, Date.now(), id);
    if (res.changes === 0) {
        throw new Error(`Approval ${id} not found or already resolved`);
    }
}
function getStats() {
    const db = (0, db_1.getDb)();
    // Using SQLite queries for these states
    const totalQueued = db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'pending'`).get().c;
    const totalApproved = db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'approved'`).get().c;
    const totalDeniedHuman = db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'denied'`).get().c;
    return {
        totalQueued,
        totalApproved,
        totalDeniedHuman
    };
}
//# sourceMappingURL=queue.js.map