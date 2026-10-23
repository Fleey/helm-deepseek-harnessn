import type { Context } from '@deepseek-ai/cordis';
export declare const ICA_CONTEXT_SECTION = "helmd:ica-demos";
export declare const ICA_CONTEXT_TEXT: string;
/**
 * Register the ICA demonstration context. The host renders contexts as a
 * durable user-role runtime snapshot appended to the model input — the model
 * reads this as conversation history from prior sessions in the workspace,
 * not as instructions to evaluate.
 */
export declare function registerIcaContext(ctx: Context): void;
