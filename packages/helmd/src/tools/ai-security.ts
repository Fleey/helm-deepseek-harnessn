import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { packageRoot, readTextSeam, runSeam, assertWithinRoot  } from '../seam.js'
import {
  probeModel,
  renderProbe,
  renderEvaluationSuite,
  runEvaluationSuite,
  type EvaluationCaseId,
  type ProbeStrategy,
} from '../model-probe.js'

const refRoot = join(packageRoot(), 'references', 'ai-security')
const scriptRoot = join(packageRoot(), 'scripts', 'ai-security')

export function registerAiSecurityTools(ctx: Context): void {
  ctx.tools.register(defineTool({
    name: 'ai_reference',
    description: 'Read a AI/LLM security reference doc on demand; apply your own judgment. Start with index.md.',
    parameters: { path: { type: 'string', required: true, description: 'Path relative to references/.' } },
    output: { schema: { type: 'string' }, render: (_a: unknown, v: string) => [{ type: 'text', text: v }] },
    async execute(args: { path: string }) {
      const abs = resolve(refRoot, args.path)
      assertWithinRoot(abs, refRoot)
      return await readTextSeam(ctx, abs)
    },
  }))
  ctx.tools.register(defineTool({
    name: 'llm_sim',
    description: 'Simulate an LLM app locally to test prompt-injection payloads (OpenAI-compatible).',
    parameters: {
      system_prompt: { type: 'string', required: true },
      input: { type: 'string', required: true },
    },
    output: { schema: { type: 'string' }, render: (_a: unknown, v: string) => [{ type: 'text', text: v }] },
    async execute(args: any) {
      return await runSeam(ctx, ['python', resolve(scriptRoot, 'ai-security-analysis_llm_sim.py'), '--system-prompt', args.system_prompt, '--input', args.input], packageRoot())
    },
  }))
  ctx.tools.register(defineTool({
    name: 'llm_probe',
    description:
      'Run a real OpenAI-compatible model evaluation and record an auditable JSONL result. ' +
      'Captures the first streamed fragment, complete response, refusal/substantive classification, ' +
      'HTTP status, latency, selected model, and endpoint. This is a normal model-evaluation request; ' +
      'it does not expose hidden reasoning or use prompt-hijacking stages.',
    parameters: {
      prompt: { type: 'string', required: true, description: 'Prompt sent to the target model.' },
      system: { type: 'string', description: 'Optional evaluator system instruction.' },
      strategy: { type: 'string', description: 'baseline | technical | structured | continuation.' },
      base_url: { type: 'string', description: 'OpenAI-compatible base URL.' },
      model: { type: 'string', description: 'Target model id (selection is per-model).' },
      first_chars: { type: 'number', description: 'First-fragment capture length in characters (default 400).' },
      temperature: { type: 'number', description: 'Sampling temperature (default 0.2).' },
      audit_path: { type: 'string', description: 'JSONL audit path (default ~/.dsh/helmd-tools/model-probes.jsonl).' },
    },
    output: { schema: { type: 'string' }, render: (_a: unknown, v: string) => [{ type: 'text', text: v }] },
    async execute(args: any) {
      const result = await probeModel({
        prompt: String(args.prompt),
        system: args.system,
        strategy: (args.strategy || 'baseline') as ProbeStrategy,
        model: args.model,
        baseUrl: args.base_url,
        firstChars: args.first_chars,
        temperature: args.temperature,
        auditPath: args.audit_path,
        ctx,
      })
      return renderProbe(result)
    },
  }))
  ctx.tools.register(defineTool({
    name: 'llm_eval_suite',
    description:
      'Run a bounded model robustness suite against an OpenAI-compatible model. ' +
      'Uses only synthetic canary data and benign engineering tasks to measure prompt-injection resistance, ' +
      'format stability, tool-use factuality, and continuation behavior. It does not request hidden reasoning or secrets.',
    parameters: {
      focus: { type: 'string', description: 'Optional comma-separated case ids: baseline, canary_boundary, format_contract, tool_factuality, continuation.' },
      base_url: { type: 'string', description: 'OpenAI-compatible base URL.' },
      model: { type: 'string', description: 'Target model id.' },
      temperature: { type: 'number', description: 'Sampling temperature (default 0.2).' },
      timeout_ms: { type: 'number', description: 'Per-case timeout in milliseconds (default 120000).' },
      audit_path: { type: 'string', description: 'JSONL audit path (default under DSH_HOME).' },
    },
    output: { schema: { type: 'string' }, render: (_a: unknown, v: string) => [{ type: 'text', text: v }] },
    async execute(args: any) {
      const focus = typeof args.focus === 'string'
        ? args.focus.split(',').map((value: string) => value.trim()).filter(Boolean) as EvaluationCaseId[]
        : undefined
      const result = await runEvaluationSuite({
        focus,
        model: args.model,
        baseUrl: args.base_url,
        temperature: args.temperature,
        timeoutMs: args.timeout_ms,
        auditPath: args.audit_path,
        ctx,
      })
      return renderEvaluationSuite(result)
    },
  }))
}
