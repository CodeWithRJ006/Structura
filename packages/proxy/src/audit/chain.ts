import * as crypto from 'crypto';

export interface AuditRowPayload {
  timestamp: number;
  tool: string;
  decision: string;
  source: string;
  reason: string | null;
  args_summary: string;
}

export function computeEntryHash(prevHash: string, payload: AuditRowPayload): string {
  // Stable key order
  const stableObj = {
    timestamp: payload.timestamp,
    tool: payload.tool,
    decision: payload.decision,
    source: payload.source,
    reason: payload.reason,
    args_summary: payload.args_summary,
  };
  const jsonStr = JSON.stringify(stableObj);
  const dataToHash = prevHash + jsonStr;
  return crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');
}
