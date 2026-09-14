export const logger = {
  debug: (msg: string, ...args: any[]) => {
    // Only log debug if requested (or default on for Phase 0)
    console.error(`[Structura DEBUG] ${redact(msg)}`, ...args.map(redact));
  },
  info: (msg: string, ...args: any[]) => {
    console.error(`[Structura INFO] ${redact(msg)}`, ...args.map(redact));
  },
  warn: (msg: string, ...args: any[]) => {
    console.error(`[Structura WARN] ${redact(msg)}`, ...args.map(redact));
  },
  error: (msg: string, ...args: any[]) => {
    console.error(`[Structura ERROR] ${redact(msg)}`, ...args.map(redact));
  }
};

// Stub for secret redaction (§6)
function redact(val: any): any {
  if (val === null || val === undefined) return val;
  
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map(redact);
    const redactedObj: any = {};
    for (const [k, v] of Object.entries(val)) {
      if (/secret|token|password|api_key|authorization/i.test(k)) {
        redactedObj[k] = '[REDACTED]';
      } else {
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
