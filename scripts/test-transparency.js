const { spawn } = require('child_process');
const path = require('path');

// Break the loop: Using mock keys for `fetch_all_payments` to prove transparency 
// via an identical authentication rejection response.
const env = {
  RZP_KEY_ID: 'rzp_test_1234567890abcd',
  RZP_KEY_SECRET: 'mocksecret4567890abcdef'
};

const binaryPath = path.join(__dirname, '..', '.upstream', 'bin', 'razorpay-mcp-server.exe');
const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');
const tsxPath = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');

const req = {
  jsonrpc: '2.0',
  id: 1,
  method: 'tools/call',
  params: {
    name: 'fetch_all_payments',
    arguments: {}
  }
};
const reqString = JSON.stringify(req) + '\n';

async function runProcess(name, command, args, envVars) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...envVars }
    });

    let output = '';
    
    child.stdout.on('data', (data) => {
      const lines = data.toString().split('\n');
      for (const line of lines) {
        if (line.includes('jsonrpc')) {
          output = line.trim();
          child.kill();
          resolve(output);
        }
      }
    });

    child.stderr.on('data', () => {}); // Ignore stderr (logs) for the diff

    child.stdin.write(reqString);

    setTimeout(() => {
      child.kill();
      reject(new Error(`${name} timed out`));
    }, 5000);
  });
}

async function main() {
  console.log('[Test] Running direct upstream binary...');
  const directEnv = {
    RZP_KEY_ID: env.RZP_KEY_ID,
    RZP_KEY_SECRET: env.RZP_KEY_SECRET,
    RZP_TOOLSETS: 'payments'
  };
  const directArgs = [
    'stdio',
    '--key', env.RZP_KEY_ID,
    '--secret', env.RZP_KEY_SECRET,
    '--toolsets', 'payments'
  ];
  const directResponse = await runProcess('Direct', binaryPath, directArgs, directEnv);

  console.log('[Test] Running proxy...');
  const proxyEnv = {
    STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
    PATH: path.join(__dirname, '..', '.upstream', 'bin') + path.delimiter + process.env.PATH,
    RZP_KEY_ID: env.RZP_KEY_ID,
    RZP_KEY_SECRET: env.RZP_KEY_SECRET,
    RZP_TOOLSETS: 'payments'
  };
  const proxyArgs = [tsxPath, proxyPath, 'stdio'];
  const proxyResponse = await runProcess('Proxy', 'node', proxyArgs, proxyEnv);

  console.log('\n--- Direct Response ---');
  console.log(directResponse);
  
  console.log('\n--- Proxy Response ---');
  console.log(proxyResponse);

  if (directResponse === proxyResponse) {
    console.log('\n[Result] PASS - Responses are byte-for-byte identical.');
  } else {
    console.log('\n[Result] FAIL - Responses differ.');
    process.exit(1);
  }
}

main().catch(console.error);
