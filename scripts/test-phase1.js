const { spawn } = require('child_process');
const path = require('path');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');
const tsxPath = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const policyPath = path.join(__dirname, '..', 'config', 'policy.example.yaml');

async function runTest(amount, expectBlock) {
  return new Promise((resolve) => {
    const proxyEnv = {
      STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
      PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
      STRUCTURA_POLICY_PATH: policyPath,
      RZP_KEY_ID: 'mock_key_123',
      RZP_KEY_SECRET: 'mock_secret_123',
      RZP_TOOLSETS: 'payments'
    };

    const child = spawn('node', [tsxPath, proxyPath, 'stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...proxyEnv }
    });

    let stdoutData = '';
    let stderrData = '';

    child.stdout.on('data', (data) => {
      stdoutData += data.toString();
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('jsonrpc')) {
          child.kill();
          resolve({ stdout: line.trim(), stderr: stderrData });
        }
      }
    });

    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    const req = {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'create_refund',
        arguments: {
          payment_id: 'pay_mock',
          amount: amount
        }
      }
    };
    
    // Give it a split second to boot
    setTimeout(() => {
      child.stdin.write(JSON.stringify(req) + '\n');
    }, 500);
  });
}

async function runMissingPolicyTest() {
  return new Promise((resolve) => {
    const proxyEnv = {
      STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
      PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
      STRUCTURA_POLICY_PATH: path.join(__dirname, '..', 'config', 'does_not_exist.yaml')
    };

    const child = spawn('node', [tsxPath, proxyPath, 'stdio'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...proxyEnv }
    });

    let stderrData = '';
    child.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    child.on('exit', (code) => {
      resolve({ code, stderr: stderrData });
    });
  });
}

async function main() {
  console.log('--- Test 1: Under limit (ALLOW) ---');
  // Limit is 1500000. Under limit is 1000000.
  const res1 = await runTest(1000000, false);
  console.log(`Proxy output JSON-RPC: ${res1.stdout}`);
  console.log(`Proxy stderr (Upstream logs included):\n${res1.stderr.trim()}`);
  
  console.log('\n--- Test 2: Over limit (REQUIRE_APPROVAL) ---');
  // Limit is 1500000. Over limit is 2000000.
  const res2 = await runTest(2000000, true);
  console.log(`Proxy output JSON-RPC: ${res2.stdout}`);
  console.log(`Proxy stderr (Should show blocked):\n${res2.stderr.trim()}`);
  
  console.log('\n--- Test 3: Missing policy file (Fail Closed) ---');
  const res3 = await runMissingPolicyTest();
  console.log(`Exit code: ${res3.code}`);
  console.log(`Proxy stderr:\n${res3.stderr.trim()}`);
  
  if (res3.code !== 1 || !res3.stderr.includes('Policy file not found')) {
    console.error('Failed missing policy test!');
    process.exit(1);
  }
}

main().catch(console.error);
