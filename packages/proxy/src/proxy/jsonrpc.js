"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLineParser = createLineParser;
const logger_1 = require("../observability/logger");
function createLineParser(onFrame) {
    let buffer = '';
    return (chunk) => {
        buffer += chunk.toString('utf-8');
        let newlineIndex;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            // Handle optional Windows \r
            const raw = line.endsWith('\r') ? line.slice(0, -1) : line;
            if (!raw.trim()) {
                continue; // Skip empty lines
            }
            let parsed = null;
            try {
                parsed = JSON.parse(raw);
            }
            catch (err) {
                logger_1.logger.warn(`Failed to parse JSON-RPC frame`, { raw, error: err });
            }
            onFrame(raw, parsed);
        }
    };
}
//# sourceMappingURL=jsonrpc.js.map