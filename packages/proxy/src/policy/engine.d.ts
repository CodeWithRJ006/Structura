import { PolicyConfig } from './schema';
export type Decision = {
    type: 'ALLOW';
} | {
    type: 'DENY';
    reason: string;
} | {
    type: 'REQUIRE_APPROVAL';
    reason: string;
};
export declare function evaluate(tool: string, args: Record<string, unknown>, policy: PolicyConfig): Decision;
//# sourceMappingURL=engine.d.ts.map