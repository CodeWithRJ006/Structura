const { spawn } = require('child_process');
const path = require('path');
const { execSync } = require('child_process');

console.log('[Test] Spawning proxy for kill-mid-session test...');

const proxyPath = path.join(__dirname, '..', 'packages', 'proxy', 'dist', 'index.js');
const binaryPath = path.join(__dirname, '..', '.upstream', 'bin', 'razorpay-mcp-server.exe');

const proxy = spawn('node', [proxyPath, binaryPath, 'stdio'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let childPid = null;

// Wait a bit for it to spawn the child process
setTimeout(() => {
  // Find the child process PID (razorpay-mcp-server.exe)
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
    console.log('[Test] Killing proxy process (SIGTERM)...');
    proxy.kill('SIGTERM');

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
        // wmic throws error if no instances found, which means success here
        console.log('[Test] Success! Child process was killed when proxy died.');
        process.exit(0);
      }
    }, 1000);
  } else {
    process.exit(1);
  }
}, 2000);
