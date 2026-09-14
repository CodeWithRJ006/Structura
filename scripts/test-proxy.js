const { spawn } = require('child_process');
const path = require('path');

console.log('[Test] Starting proxy wrapping mock-server...');

const proxyPath = path.join(__dirname, '..', 'proxy', 'dist', 'index.js');
const mockServerPath = path.join(__dirname, 'mock-server.js');

const proxy = spawn('node', [proxyPath, 'node', mockServerPath], {
  stdio: ['pipe', 'pipe', 'inherit']
});

let responseCount = 0;

proxy.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim() !== '');
  lines.forEach(line => {
    console.log(`[Test] Proxy output: ${line}`);
    const parsed = JSON.parse(line);
    if (parsed.result && parsed.result.message) {
      responseCount++;
    }
  });
  
  if (responseCount >= 2) {
    console.log('[Test] Success! Proxy transparently relayed JSON-RPC.');
    proxy.kill();
    process.exit(0);
  }
});

const req1 = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: {} };
const req2 = { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} };

console.log(`[Test] Sending req1: ${JSON.stringify(req1)}`);
proxy.stdin.write(JSON.stringify(req1) + '\n');

console.log(`[Test] Sending req2: ${JSON.stringify(req2)}`);
proxy.stdin.write(JSON.stringify(req2) + '\n');
