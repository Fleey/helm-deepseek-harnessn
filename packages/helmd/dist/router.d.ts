import type { Context } from '@deepseek-ai/cordis';
export interface RouteHit {
    key: string;
    why: string;
    score: number;
}
export declare function matchRoute(hint: string): RouteHit[];
export declare function renderRoute(hint: string): string;
export declare function resolveReferenceFile(root: string, userPath?: string): string | null;
export declare function registerRouterTools(ctx: Context): void;
