const { spawn } = require('child_process');
const path = require('path');
const tsxPath = path.join(__dirname, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const proxyPath = path.join(__dirname, 'packages', 'proxy', 'src', 'index.ts');

const child = spawn('node', [tsxPath, proxyPath, 'stdio'], {
  env: { 
    ...process.env, 
    STRUCTURA_UPSTREAM_CMD: 'razorpay-mcp-server',
    PATH: path.join(__dirname, '.upstream', 'bin') + path.delimiter + process.env.PATH,
    RZP_KEY_ID: 'mock', RZP_KEY_SECRET: 'mock', RZP_TOOLSETS: 'payments,refunds'
  }
});

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:4000/pending');
    const data = await res.json();
    console.log("CURL /pending response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (e) { console.error(e); }
  child.kill();
  process.exit(0);
}, 2000);
