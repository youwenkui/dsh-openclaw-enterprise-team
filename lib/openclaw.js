import { execFile } from 'node:child_process'

const MAX_BUFFER = 16 * 1024 * 1024

export function sanitizeError(value) {
  let result = String(value)
  const home = process.env.HOME
  if (home) result = result.split(home).join('$HOME')
  return result
    .replace(/((?:token|cookie|authorization|api[_-]?key)\s*[:=]\s*)\S+/gi, '$1[REDACTED]')
    .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
    .slice(0, 2000)
}

export function runOpenClaw(command, args, options = {}) {
  const timeout = (options.timeoutSeconds ?? 600) * 1000
  return new Promise((resolve, reject) => {
    execFile(command, args, {
      encoding: 'utf8',
      maxBuffer: MAX_BUFFER,
      timeout,
      env: process.env,
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = sanitizeError(stderr.trim() || stdout.trim() || error.message)
        reject(new Error(`OpenClaw command failed: ${detail}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

export function parseJsonOutput(value, operation) {
  try {
    return JSON.parse(value)
  } catch {
    throw new Error(`OpenClaw ${operation} returned invalid JSON`)
  }
}

export async function health(client) {
  const result = parseJsonOutput(await client(['health', '--json']), 'health')
  return {
    ok: result.ok === true,
    eventLoopDegraded: result.eventLoop?.degraded === true,
    pluginErrors: Array.isArray(result.plugins?.errors) ? result.plugins.errors.length : 0,
  }
}

export async function listAgents(client) {
  const agents = parseJsonOutput(await client(['agents', 'list', '--json']), 'agents list')
  return agents.map(({ id, identityName, identityEmoji, isDefault }) => ({
    id,
    identityName,
    identityEmoji,
    isDefault,
  }))
}

export function sanitizeAgentResult(value) {
  const payloads = Array.isArray(value?.result?.payloads)
    ? value.result.payloads
        .map((payload) => typeof payload?.text === 'string' ? payload.text : null)
        .filter(Boolean)
    : []
  const text = payloads.join('\n\n') || value?.result?.finalAssistantVisibleText || ''
  return {
    runId: value?.runId ?? null,
    status: value?.status ?? 'unknown',
    summary: value?.summary ?? null,
    text,
  }
}

export async function runAgent(client, input, defaults) {
  const agentId = input.agentId || defaults.defaultAgentId
  const sessionKey = input.sessionKey || `agent:${agentId}:dsh-${crypto.randomUUID()}`
  const args = [
    'agent',
    '--agent', agentId,
    '--session-key', sessionKey,
    '--message', input.objective,
    '--timeout', String(defaults.timeoutSeconds),
    '--json',
  ]
  const result = sanitizeAgentResult(parseJsonOutput(await client(args), 'agent'))
  return { agentId, sessionKey, result }
}

export async function continueAgent(client, input, defaults) {
  const args = [
    'agent',
    '--session-key', input.sessionKey,
    '--message', input.message,
    '--timeout', String(defaults.timeoutSeconds),
    '--json',
  ]
  const result = sanitizeAgentResult(parseJsonOutput(await client(args), 'agent resume'))
  return { sessionKey: input.sessionKey, result }
}
