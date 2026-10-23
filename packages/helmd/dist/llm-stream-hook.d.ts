/**
 * LLM Stream Refusal Interception & Retry Hook
 *
 * Single `llm/stream` listener owning the retry loop. The host hands the
 * waterfall a DEEP-FROZEN request (dsh-agent-loop buildRequest freezes the
 * request object, the message array and every message), so mutating the
 * outbound request in place is impossible — assignment throws "Cannot assign
 * to read only property". Each retry therefore re-enters the `llm` service
 * with a request object this plugin owns:
 *
 *   monitoring (inbound)  — buffers the first window of reasoning/content deltas,
 *                           aborts refusal streams before they finish;
 *   re-entry  (outbound)  — on refusal, builds an unfrozen request copy with
 *                           laundered history + prefill carrier + refusal
 *                           stop-strings and calls `llm.stream(nested)`; the
 *                           nested dispatch re-runs this listener (marked via
 *                           `__helmdAttempt`), so the ladder recurses with a
 *                           hard budget of MAX_RETRIES.
 *
 * Attempt ladder (MAX_RETRIES=3 → four attempts):
 *   a0 host request — monitored, abortable (frozen: no laundering possible)
 *   a1 nested       — laundered + true prefill (assistant-last) + stop-strings
 *   a2 nested       — laundered + carrier + user continuation (pair) + stop-strings
 *   a3 last         — laundered plain history, monitored-but-never-aborted honest
 *                     passthrough (the ceiling: whatever the model says ships as-is)
 *
 * Transport failures at a1 degrade to the pair form (a2); at a0/a2+ they surface
 * honestly. A prefill attempt that ends with zero visible output (stop-strings
 * fired immediately) is classified as an empty response and retried.
 *
 * Decision settlement: the content buffer is classified not only when it crosses
 * the window but also at block-end / finish / natural stream end — short refusals
 * (no newline, under the window) must not escape unclassified. Text block-starts
 * are held until the first content emission so aborted attempts leak no orphan
 * block markers to the host renderer.
 *
 * Config: HELMD_STREAM_MODE=off|reactive|always, HELMD_STREAM_RETRIES=N (default 3).
 */
import type { Context } from '@deepseek-ai/cordis';
import { type FailureClass } from './jailbreak-prompt-router.js';
export declare function isStreamRefusal(text: string): boolean;
export declare function isReasoningRefusal(text: string): boolean;
/**
 * 历史清洗：assistant 轮的拒绝文本替换为中性归档标记——模型不再看到"自己拒绝过"
 * 的历史，self-consistency 不为拒绝背书。幂等：标记文本不命中 RE。
 */
export declare function launderHistory(messages: unknown): unknown;
/** 追加 prefill 载体（幂等：先剥离上一轮注入的尾部再拼）。 */
export declare function withPrefill(messages: unknown, form: 'assistant-last' | 'pair'): unknown;
export declare function getStreamInterceptionStats(): {
    count: number;
    retries: number;
    lastTime: string | null;
    lastSnippet: string | null;
    lastPhase: string | null;
    logFile: string;
};
/** 构造一次重试请求：本插件自有的未冻结对象（宿主原请求深冻结，无法原地改写）。 */
export declare function buildNestedRequest(options: any, nextAttempt: number, failureClass?: FailureClass): Record<string, unknown>;
export declare function registerLlmStreamHook(ctx: Context): void;
