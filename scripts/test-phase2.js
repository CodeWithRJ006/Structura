const { spawn } = require('child_process');
const path = require('path');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');
const tsxPath = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const policyPath = path.join(__dirname, '..', 'config', 'policy.yaml');

async function runEndToEnd(scenario, calls) {
  return new Promise((resolve) => {
    const proxyEnv = {
      STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
      PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
      STRUCTURA_POLICY_PATH: policyPath,
      RZP_KEY_ID: 'mock_key_123',
      RZP_KEY_SECRET: 'mock_secret_123',
      RZP_TOOLSETS: 'payments,refunds'
    };

    const child = spawn('node', [tsxPath, proxyPath, 'stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...proxyEnv }
    });

    let stdoutData = '';
    let stderrData = '';
    let jsonResponses = [];

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      const lines = data.toString().split('\n').filter(l => l.trim());
      for (const line of lines) {
        if (line.includes('jsonrpc')) {
          jsonResponses.push(line.trim());
          if (jsonResponses.length === calls.length) {
            // Got all responses
            child.kill();
            resolve({ stdout: jsonResponses, stderr: stderrData });
          }
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    // Send the sequence of calls
    setTimeout(() => {
      calls.forEach((req, idx) => {
        setTimeout(() => {
          child.stdin.write(JSON.stringify(req) + '\n');
        }, idx * 100);
      });
    }, 500);
  });
}

async function main() {
  console.log('--- Test 1: True Positive (5x ₹10,000 to same payment_id) ---');
  // First call should succeed (10k < 15k). Second should fail (20k > 15k). Remaining fail.
  const callsTP = [];
  for (let i = 1; i <= 5; i++) {
    callsTP.push({
      jsonrpc: '2.0',
      id: i,
      method: 'tools/call',
      params: { name: 'create_refund', arguments: { payment_id: 'pay_same', amount: 1000000 } }
    });
  }
  
  const res1 = await runEndToEnd('True Positive', callsTP);
  console.log('\n[Client Received Responses]:');
  res1.stdout.forEach((r, i) => console.log(`Call ${i+1}: ${r}`));
  console.log('\n[Proxy/Upstream Stderr]:');
  console.log(res1.stderr.trim());
  

  console.log('\n--- Test 2: False Positive Check (5x ₹10,000 to different payment_ids) ---');
  // All should succeed as they group into different buckets.
  const callsFP = [];
  for (let i = 1; i <= 5; i++) {
    callsFP.push({
      jsonrpc: '2.0',
      id: i,
      method: 'tools/call',
      params: { name: 'create_refund', arguments: { payment_id: `pay_diff_${i}`, amount: 1000000 } }
    });
  }

  const res2 = await runEndToEnd('False Positive', callsFP);
  console.log('\n[Client Received Responses]:');
  res2.stdout.forEach((r, i) => console.log(`Call ${i+1}: ${r}`));
  console.log('\n[Proxy/Upstream Stderr]:');
  console.log(res2.stderr.trim());
}

main().catch(console.error);
