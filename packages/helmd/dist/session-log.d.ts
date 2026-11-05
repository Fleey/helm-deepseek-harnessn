/** The session surface helm-d relies on; anything else is host-internal. */
export interface SessionLike {
    /** Current host: frozen snapshot of the whole append-only log, oldest first. */
    snapshotEvents?: () => readonly unknown[];
    /** Pre-0.1.2-alpha.4 host: the live log array (removed upstream). */
    events?: readonly unknown[];
    /** Session identity, when the host exposes it. */
    id?: string;
    /** Durable session metadata; `delegationDepth > 0` marks a subagent child. */
    header?: {
        delegationDepth?: number;
    };
}
/** The agent surface helm-d relies on. */
export interface AgentLike {
    id?: string;
    session?: SessionLike;
}
/** One `tool/call` event's payload, as helm-d needs it. */
export interface ToolCall {
    name: string;
    args: string;
}
/** Host session event names helm-d reads. One spelling per concept, exported. */
export declare const USER_MESSAGE = "user/message";
export declare const ASSISTANT_MESSAGE = "assistant/message";
export declare const TOOL_CALL = "tool/call";
/** Warn once per process per key: hooks run every turn, the diagnosis is worth one line. */
export declare function warnOnce(key: string, message: string): void;
/**
 * The agent's session event log, oldest first.
 * Empty when the host exposes no readable log — reported once, never silent.
 * @param agent - the assemble/tool context's agent; the session hangs off it.
 * @param scope - caller name, used as the once-per-process warning key and prefix.
 */
export declare function sessionEvents(agent: AgentLike | undefined, scope: string): readonly unknown[];
/** One event's message text: a plain string or joined content blocks; '' otherwise. */
export declare function eventText(event: unknown): string;
/** Whether the window holds any event of one of `types` (host event names, exact). */
export declare function hasEventType(events: readonly unknown[], types: readonly string[]): boolean;
/**
 * Text of the newest event of `type`; null when the window holds none.
 * An empty newest event stays empty — callers that need to look further back own that rule.
 */
export declare function latestEventText(events: readonly unknown[], type: string): string | null;
/** Concatenated text of every event of `type`, in log order. */
export declare function eventTexts(events: readonly unknown[], type: string): string;
/** How many events of `type` the window holds. */
export declare function eventCount(events: readonly unknown[], type: string): number;
/** The `tool/call` events in the window, in order, with stringified arguments. */
export declare function toolCalls(events: readonly unknown[]): ToolCall[];
