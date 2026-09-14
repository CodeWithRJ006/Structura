const { spawn } = require('child_process');
const path = require('path');

console.log('[Test] Spawning proxy for malformed-JSON test...');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'dist', 'index.js');
const binaryPath = path.join(__dirname, '..', '.upstream', 'bin', 'razorpay-mcp-server.exe');

const proxy = spawn('node', [proxyPath, binaryPath, 'stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let gotValidResponse = false;

proxy.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(l => l.trim() !== '');
  lines.forEach(line => {
    try {
      const parsed = JSON.parse(line);
      if (parsed.id === 2 && parsed.result) {
        console.log('[Test] Success! Proxy recovered from malformed JSON and processed subsequent request.');
        gotValidResponse = true;
        proxy.kill();
        process.exit(0);
      }
    } catch(e) {}
  });
});

proxy.stderr.on('data', (data) => {
  console.log(`[Proxy Stderr]: ${data.toString().trim()}`);
});

console.log('[Test] Sending malformed JSON...');
proxy.stdin.write('}{ this is not json !!\n');

setTimeout(() => {
  console.log('[Test] Sending valid JSON-RPC request after malformed one...');
  const req = { jsonrpc: '2.0', id: 2, method: 'tools/list' };
  proxy.stdin.write(JSON.stringify(req) + '\n');
}, 500);

setTimeout(() => {
  if (!gotValidResponse) {
    console.log('[Test] Failure: Did not get response to valid request.');
    proxy.kill();
    process.exit(1);
  }
}, 3000);
