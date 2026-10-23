// persistToCase: wraps ctx.tools.register once in apply() so every domain
// tool gains evidence persistence with zero per-tool edits. Soft gate:
// without an active case tools behave exactly as before (plus a footer).
import { getCase, saveEvidence } from './case.js';
const NO_PERSIST = new Set([
    // knowledge / router / session tools — outputs are not case artifacts
    'skill_catalog', 'read_reference', 'analysis_mode', 'route_task',
    'evidence_reference', 'native_reference', 'web_reference',
    'malware_reference', 'ai_reference', 'protocol_reference',
    'tool_recommend', 'find_tool',
    // case lifecycle itself
    'begin_case', 'case_status', 'record_finding', 'end_case', 'save_evidence',
]);
export function isNoPersist(toolName) {
    return NO_PERSIST.has(toolName);
}
async function persistHook(sessionId, toolName, result) {
    if (typeof result !== 'string')
        return result;
    const active = getCase(sessionId);
    if (!active) {
        return result + '\n[no active case — output NOT persisted. begin_case(goal, samples) keeps evidence.]';
    }
    const firstLine = result.split('\n').find((l) => l.trim()) ?? '';
    const { id } = await saveEvidence(active.dir, toolName, result, firstLine);
    return result + `\n[evidence: ${id} saved to ${active.name}]`;
}
/**
 * Wrap register so every later-registered tool executes through the hook.
 * Must be called BEFORE any register*Tools(ctx) in apply().
 */
export function applyPersistenceWrap(ctx) {
    const target = ctx.tools;
    const originalRegister = target.register;
    target.register = (def) => {
        if (!def || typeof def.execute !== 'function' || isNoPersist(def.name)) {
            return originalRegister.call(ctx.tools, def);
        }
        const original = def.execute.bind(def);
        def.execute = async (args, exec) => {
            const result = await original(args, exec);
            return await persistHook(exec?.agent?.id, def.name, result);
        };
        return originalRegister.call(ctx.tools, def);
    };
    return () => {
        target.register = originalRegister;
    };
}
//# sourceMappingURL=persist.js.map