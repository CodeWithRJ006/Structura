const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO_URL = 'https://github.com/razorpay/razorpay-mcp-server.git';
const PINNED_SHA = '7950d51d118ca164c32b7cf0cfaa14f34f24849f';
const TARGET_DIR = path.join(__dirname, '..', '.upstream');

console.log(`[Structura] Setting up upstream testing binary in ${TARGET_DIR}...`);

if (!fs.existsSync(TARGET_DIR)) {
  console.log(`[Structura] Cloning upstream repository...`);
  execSync(`git clone ${REPO_URL} ${TARGET_DIR}`, { stdio: 'inherit' });
} else {
  console.log(`[Structura] Upstream directory exists, fetching latest...`);
  execSync(`git fetch origin`, { cwd: TARGET_DIR, stdio: 'inherit' });
}

console.log(`[Structura] Checking out pinned SHA: ${PINNED_SHA}`);
execSync(`git checkout ${PINNED_SHA}`, { cwd: TARGET_DIR, stdio: 'inherit' });

console.log(`[Structura] Building razorpay-mcp-server...`);
// Go build command requires Go to be installed
try {
  execSync(`go build -o razorpay-mcp-server.exe ./cmd/razorpay-mcp-server`, { cwd: TARGET_DIR, stdio: 'inherit' });
  console.log(`[Structura] Upstream binary built successfully.`);
} catch (err) {
  console.error(`[Structura] Failed to build upstream binary. Please ensure Go is installed.`);
  process.exit(1);
}
