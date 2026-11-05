import type { Context } from '@deepseek-ai/cordis';
export declare function isNoPersist(toolName: string): boolean;
/**
 * Wrap register so every later-registered tool executes through the hook.
 * Must be called BEFORE any register*Tools(ctx) in apply().
 */
export declare function applyPersistenceWrap(ctx: Context): () => void;
