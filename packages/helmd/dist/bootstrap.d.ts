import type { Context } from '@deepseek-ai/cordis';
export declare const name = "helmd-tool-bootstrap";
/** Prompt assembly must exist before this request filter can register. */
export declare const inject: string[];
type PromoteMode = 'tool-call' | 'assistant-message' | 'either';
export interface BootstrapConfig {
    shellTools?: string[];
    commonTools?: string[];
    promoteOn?: PromoteMode;
}
export declare function applyBootstrapFilter(ctx: Context, config?: BootstrapConfig): void;
export {};
