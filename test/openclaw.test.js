import assert from 'node:assert/strict'
import test from 'node:test'
import { continueAgent, health, listAgents, parseJsonOutput, runAgent, sanitizeAgentResult, sanitizeError } from '../lib/openclaw.js'

test('health returns only a minimal safe projection', async () => {
  const result = await health(async () => JSON.stringify({
    ok: true,
    eventLoop: { degraded: false },
    plugins: { errors: [], loaded: ['private-plugin'] },
    channels: { telegram: { accountId: 'secret-account' } },
  }))
  assert.deepEqual(result, { ok: true, eventLoopDegraded: false, pluginErrors: 0 })
  assert.equal(JSON.stringify(result).includes('secret-account'), false)
})

test('listAgents exposes useful fields without local paths', async () => {
  const result = await listAgents(async () => JSON.stringify([{
    id: 'chief', identityName: 'Chief', model: 'openai/gpt', workspace: '/secret/path', isDefault: true,
  }]))
  assert.deepEqual(result, [{ id: 'chief', identityName: 'Chief', identityEmoji: undefined, isDefault: true }])
  assert.equal('workspace' in result[0], false)
  assert.equal('model' in result[0], false)
})

test('runAgent uses a stable caller-provided session', async () => {
  let called
  const result = await runAgent(async (args) => {
    called = args
    return '{"status":"ok"}'
  }, { objective: 'Research', agentId: 'chief', sessionKey: 'agent:chief:dsh-demo' }, { defaultAgentId: 'main', timeoutSeconds: 60 })
  assert.equal(result.sessionKey, 'agent:chief:dsh-demo')
  assert.deepEqual(result.result, { runId: null, status: 'ok', summary: null, text: '' })
  assert.deepEqual(called.slice(0, 6), ['agent', '--agent', 'chief', '--session-key', 'agent:chief:dsh-demo', '--message'])
})

test('continueAgent never creates a second state id', async () => {
  const result = await continueAgent(async () => '{"status":"ok"}', {
    sessionKey: 'agent:chief:dsh-demo', message: 'Continue',
  }, { timeoutSeconds: 60 })
  assert.equal(result.sessionKey, 'agent:chief:dsh-demo')
})

test('invalid CLI JSON fails loudly', () => {
  assert.throws(() => parseJsonOutput('not json', 'test'), /invalid JSON/)
})

test('agent result strips system prompt reports, paths, models and tool inventories', () => {
  const result = sanitizeAgentResult({
    runId: 'run-safe', status: 'ok', summary: 'completed',
    result: {
      payloads: [{ text: 'SAFE_RESULT', mediaUrl: '/Users/private/file.png' }],
      meta: {
        model: 'private-model',
        systemPromptReport: { workspaceDir: '/Users/private/workspace', tools: ['secret-tool'] },
      },
    },
  })
  assert.deepEqual(result, { runId: 'run-safe', status: 'ok', summary: 'completed', text: 'SAFE_RESULT' })
  const serialized = JSON.stringify(result)
  assert.equal(serialized.includes('/Users/'), false)
  assert.equal(serialized.includes('private-model'), false)
  assert.equal(serialized.includes('secret-tool'), false)
})

test('errors redact home directories and credentials', () => {
  const value = sanitizeError(`${process.env.HOME}/workspace token=secret Bearer abc123`)
  assert.equal(value.includes(process.env.HOME), false)
  assert.equal(value.includes('secret'), false)
  assert.equal(value.includes('abc123'), false)
})
