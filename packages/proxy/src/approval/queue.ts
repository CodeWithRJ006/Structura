import { getDb } from './db';
import { v4 as uuidv4 } from 'uuid';

export interface ApprovalRecord {
  id: string;
  tool: string;
  args_json: string;
  raw_request: string;
  source: 'policy' | 'structuring';
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  result_json?: string;
  created_at: number;
  resolved_at?: number;
}

export function insertPending(
  tool: string,
  args: Record<string, unknown>,
  rawRequest: string,
  source: 'policy' | 'structuring',
  reason: string
): string {
  const id = uuidv4();
  const stmt = getDb().prepare(`
    INSERT INTO approvals (id, tool, args_json, raw_request, source, reason, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(id, tool, JSON.stringify(args), rawRequest, source, reason, Date.now());
  return id;
}

export function getPending(): ApprovalRecord[] {
  return getDb().prepare(`SELECT * FROM approvals WHERE status = 'pending' ORDER BY created_at DESC`).all() as ApprovalRecord[];
}

export function getApproval(id: string): ApprovalRecord | undefined {
  return getDb().prepare(`SELECT * FROM approvals WHERE id = ?`).get(id) as ApprovalRecord | undefined;
}

export function resolveApproval(id: string, status: 'approved' | 'denied', resultJson?: string) {
  const stmt = getDb().prepare(`
    UPDATE approvals 
    SET status = ?, result_json = ?, resolved_at = ? 
    WHERE id = ? AND status = 'pending'
  `);
  
  const res = stmt.run(status, resultJson || null, Date.now(), id);
  if (res.changes === 0) {
    throw new Error(`Approval ${id} not found or already resolved`);
  }
}

export function getStats() {
  const db = getDb();
  // Using SQLite queries for these states
  const totalQueued = (db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'pending'`).get() as any).c;
  const totalApproved = (db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'approved'`).get() as any).c;
  const totalDeniedHuman = (db.prepare(`SELECT COUNT(*) as c FROM approvals WHERE status = 'denied'`).get() as any).c;
  
  return {
    totalQueued,
    totalApproved,
    totalDeniedHuman
  };
}
