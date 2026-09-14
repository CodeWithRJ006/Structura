"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
const fs_1 = __importDefault(require("fs"));
const yaml_1 = __importDefault(require("yaml"));
const schema_1 = require("./schema");
const logger_1 = require("../observability/logger");
function loadPolicy(filepath) {
    try {
        if (!fs_1.default.existsSync(filepath)) {
            throw new Error(`Policy file not found: ${filepath}`);
        }
        const content = fs_1.default.readFileSync(filepath, 'utf8');
        const parsed = yaml_1.default.parse(content);
        return schema_1.PolicySchema.parse(parsed);
    }
    catch (err) {
        logger_1.logger.error(`Failed to load policy: ${err.message || String(err)}`);
        process.exit(1);
    }
}
//# sourceMappingURL=loader.js.map