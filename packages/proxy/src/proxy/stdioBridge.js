"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StdioBridge = void 0;
const child_process_1 = require("child_process");
const jsonrpc_1 = require("./jsonrpc");
const logger_1 = require("../observability/logger");
const engine_1 = require("../policy/engine");
const schema_1 = require("../policy/schema");
const state_1 = require("../structuring/state");
const detector_1 = require("../structuring/detector");
const queue_1 = require("../approval/queue");
const notify_1 = require("../approval/notify");
class StdioBridge {
    targetCommand;
    targetArgs;
    policy;
    child = null;
    structState = new state_1.StructuringState();
    pendingResolvers = new Map();
    constructor(targetCommand, targetArgs, policy) {
        this.targetCommand = targetCommand;
        this.targetArgs = targetArgs;
        this.policy = policy;
    }
    injectRequest(rawRequest, reqId) {
        return new Promise((resolve) => {
            this.pendingResolvers.set(reqId, resolve);
            this.child.stdin.write(rawRequest + '\n');
        });
    }
    start() {
        this.child = (0, child_process_1.spawn)(this.targetCommand, this.targetArgs, {
            stdio: ['pipe', 'pipe', 'inherit'] // Intercept stdin/stdout, let stderr through
        });
        if (!this.child.stdin || !this.child.stdout) {
            throw new Error("Failed to initialize pipes to child process");
        }
        // Ensure child process is killed when the proxy exits
        process.on('SIGINT', () => {
            if (this.child)
                this.child.kill();
            process.exit(0);
        });
        process.on('SIGTERM', () => {
            if (this.child)
                this.child.kill();
            process.exit(0);
        });
        process.on('exit', () => {
            if (this.child)
                this.child.kill();
        });
        const handleClientFrame = (raw, parsed) => {
            if (parsed) {
                logger_1.logger.debug('Frame relayed', { direction: 'client->upstream', method: parsed.method, id: parsed.id });
                if (parsed.method === 'tools/call') {
                    const tool = parsed.params?.name;
                    const args = parsed.params?.arguments || {};
                    let decision = (0, engine_1.evaluate)(tool, args, this.policy);
                    let source = 'policy';
                    logger_1.logger.info(`Phase 1 Policy decision for ${tool}: ${decision.type}`, { tool, decision });
                    if (decision.type === 'ALLOW') {
                        const structDecision = (0, detector_1.checkStructuring)(tool, args, this.structState, this.policy);
                        if (structDecision.type === 'REQUIRE_APPROVAL') {
                            logger_1.logger.info(`Phase 2 Structuring decision for ${tool}: REQUIRE_APPROVAL`, { tool, decision: structDecision });
                            decision = structDecision;
                            source = 'structuring';
                        }
                        else {
                            logger_1.logger.info(`Phase 2 Structuring decision for ${tool}: ALLOW`, { tool, decision: structDecision });
                            // Record structuring state since it's going through
                            const structRule = this.policy.structuring?.find(r => r.tool === tool);
                            if (structRule && typeof args.amount === 'number') {
                                const groupKey = String(args[structRule.group_by]);
                                this.structState.record(tool, groupKey, args.amount);
                            }
                        }
                    }
                    if (decision.type === 'REQUIRE_APPROVAL') {
                        const ticketId = (0, queue_1.insertPending)(tool, args, raw, source, decision.reason);
                        (0, notify_1.notifyPending)(ticketId, tool, decision.reason, args);
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
                    }
                    else if (decision.type === 'DENY') {
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
            this.child.stdin.write(raw + '\n');
        };
        const handleServerFrame = (raw, parsed) => {
            if (parsed) {
                logger_1.logger.debug('Frame relayed', { direction: 'upstream->client', method: parsed.method, id: parsed.id });
                if (parsed.id !== undefined && this.pendingResolvers.has(parsed.id)) {
                    const resolve = this.pendingResolvers.get(parsed.id);
                    this.pendingResolvers.delete(parsed.id);
                    resolve(parsed);
                    return; // Do NOT pipe this response to original client stdout
                }
            }
            // Phase 0: Just relay raw untouched
            process.stdout.write(raw + '\n');
        };
        const clientParser = (0, jsonrpc_1.createLineParser)(handleClientFrame);
        const serverParser = (0, jsonrpc_1.createLineParser)(handleServerFrame);
        process.stdin.on('data', clientParser);
        this.child.stdout.on('data', serverParser);
        this.child.on('exit', (code) => {
            logger_1.logger.info(`Child process exited with code ${code}`);
            process.exit(code || 0);
        });
        this.child.on('error', (err) => {
            logger_1.logger.error(`Child process error: ${err.message}`);
            process.exit(1);
        });
        // Handle proxy process termination (Kill mid-session test)
        process.on('SIGINT', () => this.child?.kill('SIGINT'));
        process.on('SIGTERM', () => this.child?.kill('SIGTERM'));
    }
}
exports.StdioBridge = StdioBridge;
//# sourceMappingURL=stdioBridge.js.map