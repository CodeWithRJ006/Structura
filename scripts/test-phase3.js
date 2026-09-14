const { spawn } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');
const tsxPath = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const dbPath = path.join(__dirname, '..', 'structura.db');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function startProxy() {
  const proxyEnv = {
    STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
    PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
    STRUCTURA_POLICY_PATH: path.join(__dirname, '..', 'config', 'policy.yaml'),
    RZP_KEY_ID: 'mock_key_123',
    RZP_KEY_SECRET: 'mock_secret_123',
    RZP_TOOLSETS: 'payments,refunds',
    STRUCTURA_DB_PATH: dbPath,
    STRUCTURA_API_PORT: 4001
  };

  const child = spawn('node', [tsxPath, proxyPath, 'stdio'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...proxyEnv }
  });

  let stdoutData = [];
  let stderrData = [];
  
  child.stdout.on('data', d => stdoutData.push(d.toString()));
  child.stderr.on('data', d => stderrData.push(d.toString()));

  await sleep(1000); // Give it time to start DB and API
  
  return {
    child,
    getStdout: () => stdoutData.join(''),
    getStderr: () => stderrData.join(''),
    clearLogs: () => { stdoutData = []; stderrData = []; },
    kill: () => {
      child.kill('SIGINT');
      return sleep(500);
    }
  };
}

async function main() {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath); // start fresh

  console.log('--- Starting Proxy ---');
  let proxy = await startProxy();
  
  console.log('--- Test 1: Trigger REQUIRE_APPROVAL ---');
  // Send 1st call (ALLOW)
  proxy.child.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'create_refund', arguments: { payment_id: 'pay_1', amount: 1000000 } }
  }) + '\n');
  await sleep(500);
  
  // Send 2nd call (REQUIRE_APPROVAL)
  proxy.child.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'create_refund', arguments: { payment_id: 'pay_1', amount: 1000000 } }
  }) + '\n');
  await sleep(500);

  console.log('Client Responses:');
  console.log(proxy.getStdout().trim());
  console.log('Proxy Stderr:');
  console.log(proxy.getStderr().trim());
  
  // Query DB directly
  const db = new Database(dbPath);
  let pendingRows = db.prepare("SELECT * FROM approvals WHERE status = 'pending'").all();
  console.log(`\nDB Query: Found ${pendingRows.length} pending row(s).`);
  
  if (pendingRows.length === 0) {
    console.error('Failed to insert pending row');
    process.exit(1);
  }
  const ticketId = pendingRows[0].id;
  console.log(`Ticket ID: ${ticketId}`);

  proxy.clearLogs();
  
  console.log('\n--- Test 2: POST /approve/:id ---');
  let res = await fetch(`http://localhost:4001/approve/${ticketId}`, { method: 'POST' });
  let data = await res.json();
  console.log('API Response:', JSON.stringify(data));
  await sleep(500);
  
  console.log('Upstream stderr during approval execution:');
  console.log(proxy.getStderr().trim());
  
  let approvedRow = db.prepare("SELECT * FROM approvals WHERE id = ?").get(ticketId);
  console.log(`DB Row Status: ${approvedRow.status}`);
  console.log(`DB Row Result JSON: ${approvedRow.result_json}`);

  proxy.clearLogs();

  console.log('\n--- Test 3: Trigger second REQUIRE_APPROVAL & POST /deny/:id ---');
  // Send 3rd call (REQUIRE_APPROVAL)
  proxy.child.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'create_refund', arguments: { payment_id: 'pay_1', amount: 1000000 } }
  }) + '\n');
  await sleep(500);

  pendingRows = db.prepare("SELECT * FROM approvals WHERE status = 'pending'").all();
  const ticketId2 = pendingRows[0].id;
  console.log(`Ticket ID 2: ${ticketId2}`);
  proxy.clearLogs();

  await fetch(`http://localhost:4001/deny/${ticketId2}`, { method: 'POST' });
  await sleep(500);
  
  console.log('Upstream stderr during deny execution (Should be EMPTY):');
  console.log(proxy.getStderr().trim() || '<empty>');

  let deniedRow = db.prepare("SELECT * FROM approvals WHERE id = ?").get(ticketId2);
  console.log(`DB Row Status: ${deniedRow.status}`);
  
  console.log('\n--- Test 4: Kill and restart proxy ---');
  await proxy.kill();
  console.log('Restarting proxy...');
  proxy = await startProxy();
  
  let allRows = db.prepare("SELECT id, status FROM approvals").all();
  console.log('DB Rows after restart:');
  console.log(allRows);
  
  await proxy.kill();
  db.close();
}

main().catch(console.error);
