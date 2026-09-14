const { spawn } = require('child_process');
const path = require('path');

console.log('[Test Real] Spawning proxy...');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'dist', 'index.js');
const binaryPath = path.join(__dirname, '..', '.upstream', 'bin', 'razorpay-mcp-server.exe');

const proxy = spawn('node', [proxyPath, binaryPath, 'stdio'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    RZP_KEY_ID: 'rzp_test_mockkeyid123',
    RZP_KEY_SECRET: 'mocksecret456',
    RZP_TOOLSETS: 'payments'
  }
});

proxy.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Test Real] Received output:\n${output}`);
  proxy.kill();
  process.exit(0);
});

const req = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
console.log(`[Test Real] Sending: ${JSON.stringify(req)}`);
proxy.stdin.write(JSON.stringify(req) + '\n');

setTimeout(() => {
  console.log('[Test Real] Timeout waiting for response');
  proxy.kill();
  process.exit(1);
}, 5000);
