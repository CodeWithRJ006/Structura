export interface Stats {
    totalQueued: number;
    totalApproved: number;
    totalDeniedHuman: number;
}
export interface ApprovalRecord {
    id: string;
    tool: string;
    args_json: string;
    source: string;
    reason: string;
    created_at: number;
}
export declare function fetchStats(): Promise<Stats>;
export declare function fetchPending(): Promise<ApprovalRecord[]>;
export declare function approveTicket(id: string): Promise<any>;
export declare function denyTicket(id: string): Promise<any>;
//# sourceMappingURL=api.d.ts.map