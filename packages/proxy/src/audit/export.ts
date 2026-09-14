import { getDb } from '../approval/db';

export function exportAuditLog() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM audit_log ORDER BY seq ASC').all();
  return JSON.stringify(rows, null, 2);
}
