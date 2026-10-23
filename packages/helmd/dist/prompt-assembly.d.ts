import type { Context } from '@deepseek-ai/cordis';
import type { AgentLike } from './session-log.js';
/** Prompt-assembly context as the running host populates it. */
export interface AssembleContextLike {
    agent?: AgentLike;
    scope?: unknown;
    signal?: AbortSignal;
}
/** The assembled-prompt fields helm-d reads or replaces; every other field passes through. */
export interface AssemblyLike {
    sections?: unknown[];
    tools?: Array<{
        name?: string;
    }>;
    contexts?: unknown[];
    variables?: Record<string, unknown>;
    [key: string]: unknown;
}
/**
 * Strips official host persona, assistant preaches, and identity boilerplate
 * from prompt sections (such as "You are a helpful software engineer assistant",
 * "我是 DeepSeek AI 助手", "You are an AI agent powered by DeepSeek Harness").
 */
export declare function stripHarnessPersona(text: string): string;
/** One listener's two phases on the waterfall. */
export interface AssemblyListener {
    /** Runs before inner listeners — producers submit their advisory here. */
    before?(context: AssembleContextLike): void;
    /** Runs after inner listeners; returns the assembly the turn will use. */
    after?(assembly: AssemblyLike, context: AssembleContextLike): AssemblyLike;
}
/** Register one listener on the host prompt-assembly waterfall. */
export declare function registerAssemblyListener(ctx: Context, listener: AssemblyListener, options?: {
    prepend?: boolean;
}): void;
/** Get live agent by session ID if registered. */
export declare function getLiveAgent(sessionId: string): AgentLike | undefined;
/** Get any active agent (most recently recorded first) as fallback. */
export declare function getFirstLiveAgent(): AgentLike | undefined;
/** The session identity behind one assembly: agent id first, session id as the fallback. */
export declare function agentSessionId(context: AssembleContextLike): string | undefined;
