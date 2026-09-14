import { spawn, ChildProcess } from 'child_process';
import { createLineParser } from './jsonrpc';
import { logger } from '../observability/logger';
import { evaluate } from '../policy/engine';
import { PolicyConfig } from '../policy/schema';

export class StdioBridge {
  private child: ChildProcess | null = null;

  constructor(
    private targetCommand: string, 
    private targetArgs: string[],
    private policy: PolicyConfig
  ) {}

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
        
        if (parsed.method === 'tools/call') {
          const tool = parsed.params?.name;
          const args = parsed.params?.arguments || {};
          
          const decision = evaluate(tool, args, this.policy);
          logger.info(`Policy decision for ${tool}: ${decision.type}`, { tool, decision });
          
          if (decision.type === 'DENY' || decision.type === 'REQUIRE_APPROVAL') {
            const errResponse = {
              jsonrpc: '2.0',
              id: parsed.id,
              result: {
                content: [{ type: 'text', text: `Policy Blocked: ${decision.reason}` }],
                isError: true
              }
            };
            process.stdout.write(JSON.stringify(errResponse) + '\n');
            return; // Do not forward this request to upstream
          }
        }
      }
      
      // Phase 0/1: Relay raw untouched if allowed or not tools/call
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
