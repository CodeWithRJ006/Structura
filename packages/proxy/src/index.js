"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stdioBridge_1 = require("./proxy/stdioBridge");
const logger_1 = require("./observability/logger");
const loader_1 = require("./policy/loader");
const db_1 = require("./approval/db");
const api_1 = require("./approval/api");
const path_1 = __importDefault(require("path"));
function main() {
    const args = process.argv.slice(2);
    let targetCommand = process.env.STRUCTURA_UPSTREAM_CMD;
    let targetArgs = args;
    if (!targetCommand) {
        if (args.length === 0) {
            logger_1.logger.error(`Usage: structura <target_command> [args...] or set STRUCTURA_UPSTREAM_CMD`);
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
    // Load policy 
    const defaultPolicyPath = path_1.default.resolve(__dirname, '..', '..', '..', 'config', 'policy.yaml');
    const policyPath = process.env.STRUCTURA_POLICY_PATH || defaultPolicyPath;
    const policy = (0, loader_1.loadPolicy)(policyPath);
    // Init SQLite DB
    (0, db_1.initDb)();
    logger_1.logger.info(`Starting proxy wrapping ${targetCommand}`);
    const bridge = new stdioBridge_1.StdioBridge(targetCommand, targetArgs, policy);
    bridge.start();
    // Start API server
    (0, api_1.startApi)((rawRequest, reqId) => bridge.injectRequest(rawRequest, reqId));
}
main();
//# sourceMappingURL=index.js.map