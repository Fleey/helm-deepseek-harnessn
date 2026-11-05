import { agentSessionId, registerAssemblyListener } from './prompt-assembly.js';
import { getCase } from './case.js';
export const CASE_SECTION = 'helm-d:case';
export function renderCaseContext(info) {
    return [
        '[helm-d case]',
        `Active case: ${info.name}`,
        `Goal: ${info.goal}`,
        `Workspace: ${info.dir}`,
        `Mode: ${info.mode}`,
        'This session is already bound to this case. Call case_status() for the current hypotheses, findings and evidence.',
        'Do not open a new case until end_case(summary) closes this one; record_finding requires a repro_cmd.',
    ].join('\n');
}
export function registerCaseContext(ctx) {
    registerAssemblyListener(ctx, {
        after(assembled, context) {
            const sessionId = agentSessionId(context);
            if (!sessionId)
                return assembled;
            const active = getCase(sessionId);
            if (!active)
                return assembled;
            try {
                const sections = Array.isArray(assembled.sections) ? assembled.sections : [];
                const without = sections.filter((section) => section?.name !== CASE_SECTION);
                return {
                    ...assembled,
                    sections: [...without, { name: CASE_SECTION, text: renderCaseContext(active) }],
                };
            }
            catch {
                return assembled;
            }
        },
    });
}
//# sourceMappingURL=case-context.js.map