export const logger = {
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
function redact(val: any): string {
  if (typeof val !== 'string') {
    try {
      val = JSON.stringify(val);
    } catch {
      return String(val);
    }
  }
  // Basic redaction stub: hide potential secrets
  return val.replace(/(rzp_(test|live)_[a-zA-Z0-9]+)|([a-zA-Z0-9]{24})/g, '[REDACTED]');
}
