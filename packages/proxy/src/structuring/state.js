"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StructuringState = void 0;
class StructuringState {
    // Map keyed by `${tool}::${groupKey}` 
    // Value is array of { amount, timestamp } entries
    store = new Map();
    record(tool, groupKey, amount, timestamp = Date.now()) {
        const key = `${tool}::${groupKey}`;
        if (!this.store.has(key)) {
            this.store.set(key, []);
        }
        this.store.get(key).push({ amount, timestamp });
    }
    getCumulative(tool, groupKey, windowHours, now = Date.now()) {
        const key = `${tool}::${groupKey}`;
        if (!this.store.has(key))
            return 0;
        // Prune entries older than the configured window
        const cutoff = now - (windowHours * 60 * 60 * 1000);
        const entries = this.store.get(key).filter(e => e.timestamp >= cutoff);
        this.store.set(key, entries);
        return entries.reduce((sum, e) => sum + e.amount, 0);
    }
}
exports.StructuringState = StructuringState;
//# sourceMappingURL=state.js.map