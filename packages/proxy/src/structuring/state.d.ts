export declare class StructuringState {
    private store;
    record(tool: string, groupKey: string, amount: number, timestamp?: number): void;
    getCumulative(tool: string, groupKey: string, windowHours: number, now?: number): number;
}
//# sourceMappingURL=state.d.ts.map