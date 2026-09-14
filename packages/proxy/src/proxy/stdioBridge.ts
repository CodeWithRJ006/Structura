import { spawn, ChildProcess } from 'child_process';
import { createLineParser } from './jsonrpc';
import { logger } from '../observability/logger';
import { evaluate } from '../policy/engine';
import { PolicyConfig } from '../policy/schema';
import { StructuringState } from '../structuring/state';
import { checkStructuring } from '../structuring/detector';

export class StdioBridge {
  private child: ChildProcess | null = null;
  private structState = new StructuringState();

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

    // Ensure child process is killed when the proxy exits
    process.on('SIGINT', () => {
      if (this.child) this.child.kill();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      if (this.child) this.child.kill();
      process.exit(0);
    });
    process.on('exit', () => {
      if (this.child) this.child.kill();
    });

    const handleClientFrame = (raw: string, parsed: any | null) => {
      if (parsed) {
        logger.debug('Frame relayed', { direction: 'client->upstream', method: parsed.method, id: parsed.id });
        
        if (parsed.method === 'tools/call') {
          const tool = parsed.params?.name;
          const args = parsed.params?.arguments || {};
          
          let decision = evaluate(tool, args, this.policy);
          logger.info(`Phase 1 Policy decision for ${tool}: ${decision.type}`, { tool, decision });
          
          if (decision.type === 'ALLOW') {
            const structDecision = checkStructuring(tool, args, this.structState, this.policy);
            if (structDecision.type === 'REQUIRE_APPROVAL') {
              logger.info(`Phase 2 Structuring decision for ${tool}: REQUIRE_APPROVAL`, { tool, decision: structDecision });
              decision = structDecision;
            } else {
              // Record structuring state since it's going through
              const structRule = this.policy.structuring?.find(r => r.tool === tool);
              if (structRule && typeof args.amount === 'number') {
                const groupKey = String(args[structRule.group_by]);
                this.structState.record(tool, groupKey, args.amount);
              }
            }
          }
          
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
      
      // Phase 0/1/2: Relay raw untouched if allowed or not tools/call
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
