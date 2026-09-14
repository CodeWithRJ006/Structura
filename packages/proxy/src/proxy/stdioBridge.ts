import { spawn, ChildProcess } from 'child_process';
import { createLineParser } from './jsonrpc';
import { logger } from '../observability/logger';

export class StdioBridge {
  private child: ChildProcess | null = null;

  constructor(private targetCommand: string, private targetArgs: string[]) {}

  public start() {
    this.child = spawn(this.targetCommand, this.targetArgs, {
      stdio: ['pipe', 'pipe', 'inherit'] // Intercept stdin/stdout, let stderr through
    });

    if (!this.child.stdin || !this.child.stdout) {
      throw new Error("Failed to initialize pipes to child process");
    }

    const handleClientFrame = (raw: string, parsed: any | null) => {
      if (parsed) {
        logger.debug('Frame relayed', { direction: 'client->upstream', method: parsed.method, id: parsed.id });
      }
      // Phase 0: Just relay raw untouched
      this.child!.stdin!.write(raw + '\n');
    };

    const handleServerFrame = (raw: string, parsed: any | null) => {
      if (parsed) {
        logger.debug('Frame relayed', { direction: 'upstream->client', method: parsed.method, id: parsed.id });
      }
      // Phase 0: Just relay raw untouched
      process.stdout.write(raw + '\n');
    };

    const clientParser = createLineParser(handleClientFrame);
    const serverParser = createLineParser(handleServerFrame);

    process.stdin.on('data', clientParser);
    this.child.stdout.on('data', serverParser);

    this.child.on('exit', (code) => {
      logger.info(`Child process exited with code ${code}`);
      process.exit(code || 0);
    });
    
    this.child.on('error', (err) => {
      logger.error(`Child process error: ${err.message}`);
      process.exit(1);
    });
    
    // Handle proxy process termination (Kill mid-session test)
    process.on('SIGINT', () => this.child?.kill('SIGINT'));
    process.on('SIGTERM', () => this.child?.kill('SIGTERM'));
  }
}
