import assert from 'node:assert/strict'
import test from 'node:test'
import { continueAgent, health, listAgents, parseJsonOutput, runAgent } from '../lib/openclaw.js'

test('health parses OpenClaw JSON', async () => {
  const result = await health(async () => '{"ok":true}')
  assert.deepEqual(result, { ok: true })
})

test('listAgents exposes useful fields without local paths', async () => {
  const result = await listAgents(async () => JSON.stringify([{
    id: 'chief', identityName: 'Chief', model: 'openai/gpt', workspace: '/secret/path', isDefault: true,
  }]))
  assert.deepEqual(result, [{
    id: 'chief', name: undefined, identityName: 'Chief', identityEmoji: undefined, model: 'openai/gpt', isDefault: true,
  }])
  assert.equal('workspace' in result[0], false)
})

test('runAgent uses a stable caller-provided session', async () => {
  let called
  const result = await runAgent(async (args) => {
    called = args
    return '{"status":"ok"}'
  }, { objective: 'Research', agentId: 'chief', sessionKey: 'agent:chief:dsh-demo' }, { defaultAgentId: 'main', timeoutSeconds: 60 })
  assert.equal(result.sessionKey, 'agent:chief:dsh-demo')
  assert.deepEqual(result.result, { status: 'ok' })
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
