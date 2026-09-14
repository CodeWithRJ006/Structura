const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  try {
    const parsed = JSON.parse(trimmed);
    const id = parsed.id;
    const response = {
      jsonrpc: '2.0',
      id: id,
      result: { message: `Mock server received method: ${parsed.method}` }
    };
    process.stdout.write(JSON.stringify(response) + '\n');
  } catch (err) {
    console.error(`Mock server failed to parse: ${err}`);
  }
});
