export interface ApprovalRecord {
    id: string;
    tool: string;
    args_json: string;
    raw_request: string;
    source: 'policy' | 'structuring';
    reason: string;
    status: 'pending' | 'approved' | 'denied';
    result_json?: string;
    created_at: number;
    resolved_at?: number;
}
export declare function insertPending(tool: string, args: Record<string, unknown>, rawRequest: string, source: 'policy' | 'structuring', reason: string): string;
export declare function getPending(): ApprovalRecord[];
export declare function getApproval(id: string): ApprovalRecord | undefined;
export declare function resolveApproval(id: string, status: 'approved' | 'denied', resultJson?: string): void;
export declare function getStats(): {
    totalQueued: any;
    totalApproved: any;
    totalDeniedHuman: any;
};
//# sourceMappingURL=queue.d.ts.map