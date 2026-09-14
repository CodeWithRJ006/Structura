const { spawn, spawnSync } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const dbPath = path.join(__dirname, '..', 'structura.db');
const tamper1Path = path.join(__dirname, '..', 'structura-tamper1.db');
const tamper2Path = path.join(__dirname, '..', 'structura-tamper2.db');
const tamper3Path = path.join(__dirname, '..', 'structura-tamper3.db');
const cliPath = path.join(__dirname, '..', 'packages', 'proxy', 'dist', 'cli.js');

async function main() {
  [dbPath, tamper1Path, tamper2Path, tamper3Path].forEach(p => {
    if (fs.existsSync(p)) fs.unlinkSync(p);
  });

  console.log('--- 1. Generating Audit Log ---');
  const proxy = spawn('node', [
    path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts'),
    'stdio'
  ], {
    env: {
      ...process.env,
      STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
      PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
      RZP_KEY_ID: 'mock', RZP_KEY_SECRET: 'mock', RZP_TOOLSETS: 'payments,refunds',
      STRUCTURA_DB_PATH: dbPath,
    }
  });

  await sleep(1500);

  // Call 1: ALLOW (fetch_all_payments)
  proxy.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'fetch_all_payments', arguments: {} } }) + '\n');
  await sleep(500);

  // Call 2: DENY (initiate_payment > 50000)
  proxy.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'initiate_payment', arguments: { amount: 100000, order_id: 'ord_123' } } }) + '\n');
  await sleep(500);

  // Call 3: REQUIRE_APPROVAL (create_refund struct threshold)
  proxy.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'create_refund', arguments: { payment_id: 'pay_123', amount: 2000000 } } }) + '\n');
  await sleep(500);

  proxy.kill('SIGKILL');
  await sleep(1000);

  fs.copyFileSync(dbPath, tamper1Path);
  fs.copyFileSync(dbPath, tamper2Path);
  fs.copyFileSync(dbPath, tamper3Path);

  console.log('\n--- 2. Verifying Untampered Log ---');
  const res0 = spawnSync('node', [cliPath, 'verify-audit-log', '--db', dbPath], { encoding: 'utf8' });
  console.log(res0.stdout.trim());
  if (res0.stderr) console.log(res0.stderr.trim());

  console.log('\n--- 3. Tamper Scenario 1: Content Tamper (seq=2) ---');
  const db1 = new Database(tamper1Path);
  db1.prepare("UPDATE audit_log SET reason = 'hacked' WHERE seq = 2").run();
  db1.close();
  const res1 = spawnSync('node', [cliPath, 'verify-audit-log', '--db', tamper1Path], { encoding: 'utf8' });
  console.log(res1.stdout.trim());
  if (res1.stderr) console.log(res1.stderr.trim());

  console.log('\n--- 4. Tamper Scenario 2: Row Deletion (seq=2) ---');
  const db2 = new Database(tamper2Path);
  db2.prepare("DELETE FROM audit_log WHERE seq = 2").run();
  db2.close();
  const res2 = spawnSync('node', [cliPath, 'verify-audit-log', '--db', tamper2Path], { encoding: 'utf8' });
  console.log(res2.stdout.trim());
  if (res2.stderr) console.log(res2.stderr.trim());

  console.log('\n--- 5. Tamper Scenario 3: Smart Tamper (seq=2 content+hash updated) ---');
  const db3 = new Database(tamper3Path);
  const crypto = require('crypto');
  const row2 = db3.prepare("SELECT * FROM audit_log WHERE seq = 2").get();
  
  // Recompute hash for tampered content
  const tamperedReason = 'hacked';
  const stableObj = {
    timestamp: row2.timestamp, tool: row2.tool, decision: row2.decision,
    source: row2.source, reason: tamperedReason, args_summary: row2.args_summary
  };
  const jsonStr = JSON.stringify(stableObj);
  const dataToHash = row2.prev_hash + jsonStr;
  const newHash = crypto.createHash('sha256').update(dataToHash, 'utf8').digest('hex');
  
  db3.prepare("UPDATE audit_log SET reason = ?, entry_hash = ? WHERE seq = 2").run(tamperedReason, newHash);
  db3.close();
  
  const res3 = spawnSync('node', [cliPath, 'verify-audit-log', '--db', tamper3Path], { encoding: 'utf8' });
  console.log(res3.stdout.trim());
  if (res3.stderr) console.log(res3.stderr.trim());
}

main();
