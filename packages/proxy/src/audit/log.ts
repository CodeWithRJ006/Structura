import { getDb } from '../approval/db';
import { computeEntryHash, AuditRowPayload } from './chain';
import { logger } from '../observability/logger';

export function appendEntry(payload: AuditRowPayload): void {
  const db = getDb();
  
  const insertTx = db.transaction((entry: AuditRowPayload) => {
    // 1. Read last hash
    const lastRow = db.prepare('SELECT entry_hash FROM audit_log ORDER BY seq DESC LIMIT 1').get() as { entry_hash: string } | undefined;
    const prevHash = lastRow ? lastRow.entry_hash : '0'.repeat(64);
    
    // 2. Compute new hash
    const entryHash = computeEntryHash(prevHash, entry);
    
    // 3. Insert
    db.prepare(`
      INSERT INTO audit_log (timestamp, tool, decision, source, reason, args_summary, prev_hash, entry_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.timestamp,
      entry.tool,
      entry.decision,
      entry.source,
      entry.reason || null,
      entry.args_summary,
      prevHash,
      entryHash
    );
  });
  
  try {
    insertTx(payload);
  } catch (error) {
    logger.error('Failed to append to audit log', { error: error instanceof Error ? error.message : String(error) });
  }
}
