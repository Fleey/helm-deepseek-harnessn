/**
 * Deterministic recovery-prompt routing for model refusals.
 *
 * This module is intentionally a recovery/evaluation layer. It does not ask a
 * model to ignore its safety boundary, reveal hidden reasoning, or fabricate
 * tool results. The refusal text is used only as a routing signal and is not
 * copied into the next request.
 */
export type FailureClass = 'scope_refusal' | 'safety_refusal' | 'identity_refusal' | 'format_refusal' | 'tool_refusal' | 'repeated_refusal' | 'empty_or_adapter_failure';
export type PromptStrategy = 'scope_clarification' | 'safety_bounded_delivery' | 'context_completion' | 'format_minimum' | 'tool_fallback' | 'task_split' | 'transport_compatibility';
export type PromptForm = 'assistant-last' | 'pair' | 'plain';
/** Recovery phase in the bounded three-pass delivery ladder. */
export type PromptPhase = 'reframe' | 'deliver' | 'fallback';
/** The task lane used to make a recovery prompt concrete instead of generic. */
export type RecoveryIntent = 'direct_delivery' | 'analysis' | 'tool_action' | 'transformation' | 'format_contract' | 'missing_context';
export interface RoutePlan {
    failureClass: FailureClass;
    strategy: PromptStrategy;
    form: PromptForm;
    phase: PromptPhase;
    prompt: string;
    intent: RecoveryIntent;
}
export interface RefusalContext {
    attempt?: number;
    priorFailures?: number;
    /** User text is used only to select a lane; it is not copied into the prompt. */
    userText?: string;
    failureClass?: FailureClass;
}
/** Classify only the refusal signal; the original refusal text stays out of prompts. */
export declare function classifyRefusal(text: string, context?: RefusalContext): FailureClass;
export declare function selectPromptStrategy(failureClass: FailureClass, attempt?: number): PromptStrategy;
export declare function selectPromptPhase(attempt?: number): PromptPhase;
/** Infer a task lane from the latest user turn without echoing that turn. */
export declare function inferRecoveryIntent(userText?: string, failureClass?: FailureClass): RecoveryIntent;
export declare function composePromptInjection(strategy: PromptStrategy, attempt?: number, context?: RefusalContext): string;
export declare function routeRefusal(failureClass: FailureClass, attempt?: number, context?: RefusalContext): RoutePlan;
/** Add a routed recovery prompt while preserving dsh's block-array content shape. */
export declare function buildRoutedMessages(messages: unknown, plan: RoutePlan): unknown;
export declare function getPromptRouteMarkers(): {
    prefix: string;
    continuation: string;
};
