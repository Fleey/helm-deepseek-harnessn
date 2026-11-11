import { type Server } from 'node:http';
export interface OobHit {
    method: string;
    url: string;
    headers: Record<string, string | string[] | undefined>;
    body: string;
    at: string;
}
export interface OobSession {
    id: string;
    url: string;
    createdAt: string;
    expiresAt: string;
    hits: OobHit[];
    server: Server;
    timer: NodeJS.Timeout;
}
export declare function startOob(ttlMs?: number): Promise<{
    id: string;
    url: string;
    expiresAt: string;
}>;
export declare function pollOob(id: string): OobHit[];
export declare function stopOob(id: string): boolean;
export declare function oobCount(): number;
