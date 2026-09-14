#!/usr/bin/env node
import * as path from 'path';
import { verifyAuditLog } from './audit/verify';

const args = process.argv.slice(2);
const command = args[0];

if (command === 'verify-audit-log') {
  let dbPath = path.resolve(process.cwd(), 'structura.db');
  const dbIndex = args.indexOf('--db');
  if (dbIndex !== -1 && args[dbIndex + 1]) {
    dbPath = path.resolve(args[dbIndex + 1]);
  }

  console.log(`Verifying audit log in DB: ${dbPath}`);
  const result = verifyAuditLog(dbPath);

  if (result.success) {
    console.log(`Success: Verified ${result.rowsVerified} rows with no broken links.`);
    process.exit(0);
  } else {
    console.error(`ERROR: ${result.error} at seq ${result.seq}`);
    console.error(`Verified ${result.rowsVerified} rows before failure.`);
    process.exit(1);
  }
} else {
  console.error('Usage: structura verify-audit-log [--db <path>]');
  process.exit(1);
}
