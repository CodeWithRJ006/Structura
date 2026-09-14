import { PolicyConfig } from '../policy/schema';
export declare class StdioBridge {
    private targetCommand;
    private targetArgs;
    private policy;
    private child;
    private structState;
    private pendingResolvers;
    constructor(targetCommand: string, targetArgs: string[], policy: PolicyConfig);
    injectRequest(rawRequest: string, reqId: number): Promise<any>;
    start(): void;
}
//# sourceMappingURL=stdioBridge.d.ts.map