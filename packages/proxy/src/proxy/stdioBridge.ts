import { spawn, ChildProcess } from 'child_process';
import { createLineParser } from './jsonrpc';
import { logger } from '../observability/logger';
import { evaluate } from '../policy/engine';
import { PolicyConfig } from '../policy/schema';
import { StructuringState } from '../structuring/state';
import { checkStructuring } from '../structuring/detector';
import { insertPending } from '../approval/queue';
import { notifyPending } from '../approval/notify';
import { appendEntry } from '../audit/log';

export class StdioBridge {
  private child: ChildProcess | null = null;
  private structState = new StructuringState();
  private pendingResolvers = new Map<number, (res: any) => void>();

  constructor(
    private targetCommand: string, 
    private targetArgs: string[],
    private policy: PolicyConfig
  ) {}

  public injectRequest(rawRequest: string, reqId: number): Promise<any> {
    return new Promise((resolve) => {
      logger.debug('Frame relayed (injected)', { direction: 'client->upstream', id: reqId });
      this.pendingResolvers.set(reqId, resolve);
      this.child!.stdin!.write(rawRequest + '\n');
    });
  }

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
          let source: 'policy' | 'structuring' = 'policy';
          logger.info(`Phase 1 Policy decision for ${tool}: ${decision.type}`, { tool, decision });
          
          if (decision.type === 'ALLOW') {
            const structDecision = checkStructuring(tool, args, this.structState, this.policy);
            if (structDecision.type === 'REQUIRE_APPROVAL') {
              logger.info(`Phase 2 Structuring decision for ${tool}: REQUIRE_APPROVAL`, { tool, decision: structDecision });
              decision = structDecision;
              source = 'structuring';
            } else {
              logger.info(`Phase 2 Structuring decision for ${tool}: ALLOW`, { tool, decision: structDecision });
              // Record structuring state since it's going through
              const structRule = this.policy.structuring?.find(r => r.tool === tool);
              if (structRule && typeof args.amount === 'number') {
                const groupKey = String(args[structRule.group_by]);
                this.structState.record(tool, groupKey, args.amount);
              }
            }
          }
          
          // Summarize args for audit log
          const argsSummaryObj: any = {};
          if (args.payment_id) argsSummaryObj.payment_id = args.payment_id;
          if (args.amount) argsSummaryObj.amount = args.amount;
          if (args.currency) argsSummaryObj.currency = args.currency;
          if (args.contact) argsSummaryObj.contact = args.contact;
          if (args.order_id) argsSummaryObj.order_id = args.order_id;
          
          appendEntry({
            timestamp: Date.now(),
            tool,
            decision: decision.type,
            source,
            reason: (decision as any).reason || null,
            args_summary: JSON.stringify(argsSummaryObj)
          });
          
          if (decision.type === 'REQUIRE_APPROVAL') {
            const ticketId = insertPending(tool, args, raw, source, decision.reason);
            notifyPending(ticketId, tool, decision.reason, args);
            
            const errResponse = {
              jsonrpc: '2.0',
              id: parsed.id,
              result: {
                content: [{ type: 'text', text: `Action is pending human review (Ticket: ${ticketId}). Reason: ${decision.reason}` }],
                isError: true
              }
            };
            process.stdout.write(JSON.stringify(errResponse) + '\n');
            return; // Do not forward this request to upstream
          } else if (decision.type === 'DENY') {
            const errResponse = {
              jsonrpc: '2.0',
              id: parsed.id,
              result: {
                content: [{ type: 'text', text: `Policy Blocked: ${decision.reason}` }],
                isError: true
              }
            };
            process.stdout.write(JSON.stringify(errResponse) + '\n');
            return; // Do not forward
          }
        }
      }
      
      // Phase 0/1/2: Relay raw untouched if allowed or not tools/call
      this.child!.stdin!.write(raw + '\n');
    };

    const handleServerFrame = (raw: string, parsed: any | null) => {
      if (parsed) {
        logger.debug('Frame relayed', { direction: 'upstream->client', method: parsed.method, id: parsed.id });
        
        if (parsed.id !== undefined && this.pendingResolvers.has(parsed.id)) {
          const resolve = this.pendingResolvers.get(parsed.id)!;
          this.pendingResolvers.delete(parsed.id);
          resolve(parsed);
          return; // Do NOT pipe this response to original client stdout
        }
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
