import { execFile } from 'node:child_process'

const MAX_BUFFER = 16 * 1024 * 1024

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
        const detail = stderr.trim() || stdout.trim() || error.message
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
  return parseJsonOutput(await client(['health', '--json']), 'health')
}

export async function listAgents(client) {
  const agents = parseJsonOutput(await client(['agents', 'list', '--json']), 'agents list')
  return agents.map(({ id, name, identityName, identityEmoji, model, isDefault }) => ({
    id,
    name,
    identityName,
    identityEmoji,
    model,
    isDefault,
  }))
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
  const result = parseJsonOutput(await client(args), 'agent')
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
  const result = parseJsonOutput(await client(args), 'agent resume')
  return { sessionKey: input.sessionKey, result }
}
