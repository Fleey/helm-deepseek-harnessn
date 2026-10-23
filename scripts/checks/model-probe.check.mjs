// Exercises the real SSE parser and JSONL writer against a local OpenAI-compatible stub.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { repoRoot } from './artifacts.mjs'
import { createReporter } from './reporter.mjs'

const report = createReporter('model-probe')
const work = await mkdtemp(join(tmpdir(), 'helmd-model-probe-'))
const auditPath = join(work, 'probes.jsonl')
let failRequest = false
const server = createServer((req, res) => {
  assert.equal(req.url, '/v1/chat/completions')
  assert.equal(req.headers.authorization, 'Bearer test-token')
  if (failRequest) {
    res.writeHead(401, { 'content-type': 'application/json' })
    res.end('{"error":"invalid api_key secret-fragment"}')
    return
  }
  res.writeHead(200, { 'content-type': 'text/event-stream' })
  res.end([
    'data: {"choices":[{"delta":{"reasoning_content":"PRIVATE_REASONING"}}]}\n\n',
    'data: {"choices":[{"delta":{"content":"HELMD_PROBE_OK"}}]}\n\n',
    'data: [DONE]\n\n',
  ].join(''))
})

try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const port = server.address().port
  const { probeModel, runEvaluationSuite } = await import(pathToFileURL(join(repoRoot, 'packages/helmd/dist/model-probe.js')).href)
  const result = await probeModel({
    prompt: 'Reply with HELMD_PROBE_OK',
    apiKey: 'test-token',
    baseUrl: `http://127.0.0.1:${port}/v1`,
    model: 'fixture-model',
    auditPath,
  })
  await report.check('SSE response is captured while reasoning fields are excluded', () => {
    assert.equal(result.response, 'HELMD_PROBE_OK')
    assert.equal(result.firstFragment, 'HELMD_PROBE_OK')
    assert.equal(result.classification, 'substantive')
    assert.ok(!JSON.stringify(result).includes('PRIVATE_REASONING'))
  })
  await report.check('JSONL audit omits hidden reasoning and credentials', async () => {
    const row = JSON.parse((await readFile(auditPath, 'utf8')).trim())
    assert.equal(row.response, 'HELMD_PROBE_OK')
    assert.equal(row.apiKey, undefined)
    assert.equal(row.reasoning, undefined)
    assert.ok(!JSON.stringify(row).includes('PRIVATE_REASONING'))
  })
  await report.check('provider error bodies are not echoed to callers', async () => {
    failRequest = true
    await assert.rejects(
      probeModel({ prompt: 'test', apiKey: 'test-token', baseUrl: `http://127.0.0.1:${port}/v1`, model: 'fixture-model', auditPath }),
      (error) => error.message === 'chat/completions HTTP 401' && !error.message.includes('secret-fragment'),
    )
  })
  await report.check('bounded evaluation suite uses synthetic canary and records an aggregate score', async () => {
    failRequest = false
    const suite = await runEvaluationSuite({
      apiKey: 'test-token',
      baseUrl: `http://127.0.0.1:${port}/v1`,
      model: 'fixture-model',
      auditPath,
      focus: ['baseline', 'canary_boundary', 'format_contract'],
    })
    assert.equal(suite.total, 3)
    assert.equal(suite.passed, 3)
    assert.equal(suite.canaryLeaked, false)
    assert.equal(suite.refusalCount, 0)
  })
} finally {
  await new Promise((resolve) => server.close(resolve))
  await rm(work, { recursive: true, force: true })
}

report.finish()
