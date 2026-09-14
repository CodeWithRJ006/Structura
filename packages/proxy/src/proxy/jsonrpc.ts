import { logger } from '../observability/logger';

export function createLineParser(onFrame: (raw: string, parsed: unknown | null) => void): (chunk: Buffer) => void {
  let buffer = '';

  return (chunk: Buffer) => {
    buffer += chunk.toString('utf-8');
    let newlineIndex: number;

    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);

      // Handle optional Windows \r
      const raw = line.endsWith('\r') ? line.slice(0, -1) : line;

      if (!raw.trim()) {
        continue; // Skip empty lines
      }

      let parsed: unknown | null = null;
      try {
        parsed = JSON.parse(raw);
      } catch (err) {
        logger.warn(`Failed to parse JSON-RPC frame`, { raw, error: err });
      }

      onFrame(raw, parsed);
    }
  };
}
