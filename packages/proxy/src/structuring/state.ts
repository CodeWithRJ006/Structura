export class StructuringState {
  // Map keyed by `${tool}::${groupKey}` 
  // Value is array of { amount, timestamp } entries
  private store: Map<string, { amount: number; timestamp: number }[]> = new Map();

  record(tool: string, groupKey: string, amount: number, timestamp: number = Date.now()) {
    const key = `${tool}::${groupKey}`;
    if (!this.store.has(key)) {
      this.store.set(key, []);
    }
    this.store.get(key)!.push({ amount, timestamp });
  }

  getCumulative(tool: string, groupKey: string, windowHours: number, now: number = Date.now()): number {
    const key = `${tool}::${groupKey}`;
    if (!this.store.has(key)) return 0;
    
    // Prune entries older than the configured window
    const cutoff = now - (windowHours * 60 * 60 * 1000);
    const entries = this.store.get(key)!.filter(e => e.timestamp >= cutoff);
    this.store.set(key, entries);
    
    return entries.reduce((sum, e) => sum + e.amount, 0);
  }
}
