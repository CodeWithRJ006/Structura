const { spawn } = require('child_process');
const path = require('path');

console.log('[Test Real] Spawning proxy via tsx directly...');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');

const proxy = spawn('npx', ['tsx', proxyPath, 'stdio'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: {
    ...process.env,
    PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
    STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
    RZP_KEY_ID: 'rzp_test_mockkeyid123',
    RZP_KEY_SECRET: 'mocksecret456',
    RZP_TOOLSETS: 'payments'
  },
  shell: true
});

proxy.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`[Test Real] Received output:\n${output}`);
  // Keep it alive to receive JSON
  if (output.includes('jsonrpc')) {
    proxy.kill();
    process.exit(0);
  }
});

// We send an actual valid JSON-RPC request to fetch tool list to prove it's fully connected
const req = { jsonrpc: '2.0', id: 1, method: 'tools/list' };
console.log(`[Test Real] Sending: ${JSON.stringify(req)}`);

// Give it a moment to boot up tsx
setTimeout(() => {
  proxy.stdin.write(JSON.stringify(req) + '\n');
}, 1000);

setTimeout(() => {
  console.log('[Test Real] Timeout waiting for response');
  proxy.kill();
  process.exit(1);
}, 6000);
