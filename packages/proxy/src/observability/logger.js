"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    debug: (msg, ...args) => {
        // Only log debug if requested (or default on for Phase 0)
        console.error(`[Structura DEBUG] ${redact(msg)}`, ...args.map(redact));
    },
    info: (msg, ...args) => {
        console.error(`[Structura INFO] ${redact(msg)}`, ...args.map(redact));
    },
    warn: (msg, ...args) => {
        console.error(`[Structura WARN] ${redact(msg)}`, ...args.map(redact));
    },
    error: (msg, ...args) => {
        console.error(`[Structura ERROR] ${redact(msg)}`, ...args.map(redact));
    }
};
// Stub for secret redaction (§6)
function redact(val) {
    if (val === null || val === undefined)
        return val;
    if (typeof val === 'object') {
        if (Array.isArray(val))
            return val.map(redact);
        const redactedObj = {};
        for (const [k, v] of Object.entries(val)) {
            if (/secret|token|password|api_key|authorization/i.test(k)) {
                redactedObj[k] = '[REDACTED]';
            }
            else {
                redactedObj[k] = redact(v);
            }
        }
        return JSON.stringify(redactedObj);
    }
    if (typeof val === 'string') {
        // Also catch hardcoded rzp_ keys or long hex just in case
        return val.replace(/(rzp_(test|live)_[a-zA-Z0-9]+)|([a-zA-Z0-9]{24})/g, '[REDACTED]');
    }
    return val;
}
//# sourceMappingURL=logger.js.map