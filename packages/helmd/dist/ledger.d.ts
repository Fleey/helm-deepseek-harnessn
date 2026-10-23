import type { Context } from '@deepseek-ai/cordis';
export declare function ledgerDir(): string;
export declare function registerToolEntry(name: string, toolPath: string, purpose: string, usage?: string, version?: string): string;
export declare function noteTool(toolName: string, content: string, evidence: string, kind: 'pitfall' | 'template'): void;
export declare function noteDeadEnd(featureTag: string, tactic: string, rootCause: string, evidence: string): void;
export declare function searchLedger(query: string): string;
/** Shelf overview + top dead-ends for the route card. Silent when ledgers absent/empty. */
export interface ShelfToolItem {
    name: string;
    cat: string;
    desc: string;
    path: string;
    status: string;
}
/**
 * Parse structured tool list from TOOLS.md so both the host plane and
 * web client can dynamically display the real installed tools on the shelf.
 */
export declare function readShelfTools(): ShelfToolItem[];
/**
 * Shelf overview + top dead-ends for the route card. Read-only: a routing card must not
 * write to a ledger, so Silent when the ledgers are absent or empty.
 */
export declare function shelfSummary(): string;
export declare function registerLedgerTool(ctx: Context): void;
