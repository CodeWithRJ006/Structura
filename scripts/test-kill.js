const { spawn } = require('child_process');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Test] Spawning proxy via tsx directly for kill-mid-session test...');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'src', 'index.ts');
const binaryPath = path.join(__dirname, '..', '.upstream', 'bin', 'razorpay-mcp-server.exe');

const tsxPath = path.join(__dirname, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');

const proxy = spawn('node', [tsxPath, proxyPath, binaryPath, 'stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let childPid = null;

setTimeout(() => {
  try {
    const tasklist = execSync('tasklist /FI "IMAGENAME eq razorpay-mcp-server.exe" /NH').toString();
    if (tasklist.includes('razorpay-mcp-server.exe')) {
      const match = tasklist.match(/razorpay-mcp-server\.exe\s+(\d+)/);
      if (match && match[1]) {
        childPid = parseInt(match[1]);
        console.log(`[Test] Found child process PID: ${childPid}`);
      }
    }
  } catch (e) {
    console.error('[Test] Could not find child process.');
    process.exit(1);
  }

  if (childPid) {
    console.log('[Test] Killing proxy process (SIGINT)...');
    // For npx on Windows, SIGTERM/SIGINT isn't always perfectly passed down to the actual node process,
    // but we kill the wrapper and see if our proxy handles it if it receives it.
    proxy.kill('SIGINT');

    setTimeout(() => {
      try {
        const tasklist2 = execSync('tasklist /FI "IMAGENAME eq razorpay-mcp-server.exe" /NH').toString();
        if (tasklist2.includes('razorpay-mcp-server.exe')) {
          console.error(`[Test] Failure: Child process ${childPid} is still running!`);
          execSync(`taskkill /PID ${childPid} /F`); // clean up
          process.exit(1);
        } else {
          console.log('[Test] Success! Child process was killed when proxy died.');
          process.exit(0);
        }
      } catch (e) {
        console.log('[Test] Success! Child process was killed when proxy died.');
        process.exit(0);
      }
    }, 2000);
  } else {
    process.exit(1);
  }
}, 3000);
