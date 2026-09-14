const { spawn } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');
const fs = require('fs');
const puppeteer = require('puppeteer');

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

const dbPath = path.join(__dirname, '..', 'structura.db');
const artifactDir = "C:\\Users\\bokin\\.gemini\\antigravity\\brain\\af2fa90d-abb7-401d-86ab-069d20c026e9";

async function main() {
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  console.log('--- Starting Proxy on Port 4000 ---');
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
      STRUCTURA_API_PORT: '4000'
    }
  });

  let proxyStderr = [];
  proxy.stderr.on('data', d => proxyStderr.push(d.toString()));
  
  await sleep(1500);

  console.log('--- Triggering REQUIRE_APPROVAL Ticket ---');
  proxy.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'create_refund', arguments: { payment_id: 'pay_ui', amount: 1000000 } }
  }) + '\n');
  await sleep(500);
  proxy.stdin.write(JSON.stringify({
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'create_refund', arguments: { payment_id: 'pay_ui', amount: 1000000 } }
  }) + '\n');
  await sleep(1000);

  console.log('--- Starting Vite Dev Server ---');
  const vite = spawn('npx', ['vite'], {
    cwd: path.join(__dirname, '..', 'packages', 'dashboard'),
    env: { ...process.env },
    shell: true
  });
  
  let viteStdout = [];
  vite.stdout.on('data', d => viteStdout.push(d.toString()));
  await sleep(3000);
  
  console.log(viteStdout.join('').trim());

  console.log('--- Launching Browser Automation ---');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  await page.goto('http://localhost:5173');
  await sleep(2000); // Wait for React to fetch from proxy and render

  console.log('Taking screenshot of pending UI...');
  await page.screenshot({ path: path.join(artifactDir, 'dashboard-pending.png') });

  console.log('Clicking "Approve" button...');
  proxyStderr = []; // Clear stderr to capture only the approval phase
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const approveBtn = btns.find(b => b.textContent.includes('Approve'));
    if (approveBtn) approveBtn.click();
  });
  
  await sleep(2000); // Wait for API call to proxy and execution

  console.log('Taking screenshot of approved UI with Result Ribbon...');
  await page.screenshot({ path: path.join(artifactDir, 'dashboard-approved.png') });
  
  await browser.close();

  console.log('\n--- Proxy Stderr During UI Approval ---');
  console.log(proxyStderr.join('').trim());

  const db = new Database(dbPath);
  const rows = db.prepare("SELECT id, status, result_json FROM approvals").all();
  console.log('\n--- DB Query After UI Approval ---');
  console.log(rows);
  
  proxy.kill('SIGINT');
  vite.kill('SIGINT');
  db.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
