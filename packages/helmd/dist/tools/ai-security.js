import { defineTool } from '@deepseek-ai/dsh-tools';
import { join, resolve } from 'node:path';
import { packageRoot, readTextSeam, runSeam, assertWithinRoot } from '../seam.js';
const refRoot = join(packageRoot(), 'references', 'ai-security');
const scriptRoot = join(packageRoot(), 'scripts', 'ai-security');
export function registerAiSecurityTools(ctx) {
    ctx.tools.register(defineTool({
        name: 'ai_reference',
        description: 'Read a AI/LLM security reference doc on demand; apply your own judgment. Start with index.md.',
        parameters: { path: { type: 'string', required: true, description: 'Path relative to references/.' } },
        output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
        async execute(args) {
            const abs = resolve(refRoot, args.path);
            assertWithinRoot(abs, refRoot);
            return await readTextSeam(ctx, abs);
        },
    }));
    ctx.tools.register(defineTool({
        name: 'llm_sim',
        description: 'Simulate an LLM app locally to test prompt-injection payloads (OpenAI-compatible).',
        parameters: {
            system_prompt: { type: 'string', required: true },
            input: { type: 'string', required: true },
        },
        output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: v }] },
        async execute(args) {
            return await runSeam(ctx, ['python', resolve(scriptRoot, 'ai-security-analysis_llm_sim.py'), '--system-prompt', args.system_prompt, '--input', args.input], packageRoot());
        },
    }));
}
//# sourceMappingURL=ai-security.js.map