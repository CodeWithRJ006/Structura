import Database from 'better-sqlite3';
import { computeEntryHash } from './chain';

export function verifyAuditLog(dbPath: string): { success: boolean; rowsVerified: number; error?: string; seq?: number } {
  let db: Database.Database;
  try {
    db = new Database(dbPath, { fileMustExist: true });
  } catch (e) {
    return { success: false, rowsVerified: 0, error: `Could not open DB at ${dbPath}` };
  }

  const rows = db.prepare('SELECT * FROM audit_log ORDER BY seq ASC').all() as any[];
  
  if (rows.length === 0) {
    return { success: true, rowsVerified: 0 };
  }

  let expectedSeq = rows[0].seq;
  let expectedPrevHash = '0'.repeat(64);

  for (const row of rows) {
    if (row.seq !== expectedSeq) {
      return { success: false, rowsVerified: expectedSeq - rows[0].seq, error: 'Gap detected (missing seq)', seq: expectedSeq };
    }

    if (row.prev_hash !== expectedPrevHash) {
      return { success: false, rowsVerified: expectedSeq - rows[0].seq, error: 'Linkage mismatch', seq: row.seq };
    }

    const computedHash = computeEntryHash(row.prev_hash, {
      timestamp: row.timestamp,
      tool: row.tool,
      decision: row.decision,
      source: row.source,
      reason: row.reason,
      args_summary: row.args_summary,
    });

    if (row.entry_hash !== computedHash) {
      return { success: false, rowsVerified: expectedSeq - rows[0].seq, error: 'Content hash mismatch', seq: row.seq };
    }

    expectedPrevHash = row.entry_hash;
    expectedSeq++;
  }

  return { success: true, rowsVerified: rows.length };
}
