export type ApprovalStatus = 'pending' | 'approved' | 'denied' | 'expired' | 'used';
export interface Approval {
    id: string;
    sessionId: string;
    tool: string;
    fingerprint: string;
    summary: string;
    status: ApprovalStatus;
    createdAt: string;
    expiresAt: string;
    decidedAt?: string;
}
export declare function listApprovals(includeDone?: boolean): Approval[];
/** Request or consume an approval. Returns allowed=false with the pending entry
 *  when the operator has not approved this exact call yet. */
export declare function requestApproval(input: {
    sessionId: string;
    tool: string;
    args: unknown;
    summary: string;
}): {
    allowed: boolean;
    approval: Approval;
};
export declare function decideApproval(id: string, decision: 'approved' | 'denied'): Approval;
