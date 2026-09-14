import { StdioBridge } from './proxy/stdioBridge';
import { logger } from './observability/logger';

function main() {
  const args = process.argv.slice(2);
  
  let targetCommand = process.env.STRUCTURA_UPSTREAM_CMD;
  let targetArgs = args;

  if (!targetCommand) {
    if (args.length === 0) {
      logger.error(`Usage: structura <target_command> [args...] or set STRUCTURA_UPSTREAM_CMD`);
      process.exit(1);
    }
    targetCommand = args[0];
    targetArgs = args.slice(1);
  }
  
  if (process.env.RZP_KEY_ID) {
    targetArgs.push('--key', process.env.RZP_KEY_ID);
  }
  if (process.env.RZP_KEY_SECRET) {
    targetArgs.push('--secret', process.env.RZP_KEY_SECRET);
  }
  if (process.env.RZP_TOOLSETS) {
    targetArgs.push('--toolsets', process.env.RZP_TOOLSETS);
  }
  
  logger.info(`Starting proxy wrapping ${targetCommand}`);
  const bridge = new StdioBridge(targetCommand, targetArgs);
  bridge.start();
}

main();
