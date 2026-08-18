import Schema from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import {
  continueAgent,
  health,
  listAgents,
  runAgent,
  runOpenClaw,
} from './lib/openclaw.js'

export const name = 'openclaw-enterprise-team'
export const inject = ['tools']

export const Config = Schema.object({
  openclawCommand: Schema.string().default('openclaw'),
  defaultAgentId: Schema.string().default('main'),
  timeoutSeconds: Schema.number().min(1).max(3600).default(600),
})

function textOutput() {
  return {
    schema: { type: 'string' },
    render: (_args, value) => [{ type: 'text', text: value }],
  }
}

function json(value) {
  return JSON.stringify(value, null, 2)
}

export function apply(ctx, config) {
  const client = (args) => runOpenClaw(config.openclawCommand, args, config)

  ctx.tools.register(defineTool({
    name: 'openclaw_team_health',
    description: 'Check whether the connected OpenClaw Gateway and enterprise team runtime are healthy.',
    parameters: {},
    output: textOutput(),
    async execute() {
      return json(await health(client))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'openclaw_team_list',
    description: 'List the OpenClaw agents that can be used as enterprise team leads or specialist members.',
    parameters: {},
    output: textOutput(),
    async execute() {
      return json(await listAgents(client))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'openclaw_team_start',
    description: 'Start an enterprise task in OpenClaw. OpenClaw owns orchestration, tools, memory, permissions, approvals and execution state.',
    parameters: {
      objective: { type: 'string', required: true, description: 'The complete business objective and acceptance criteria.' },
      agentId: { type: 'string', required: false, description: 'OpenClaw lead agent id. Uses the configured default when omitted.' },
      sessionKey: { type: 'string', required: false, description: 'Stable OpenClaw session key. A new one is generated when omitted.' },
    },
    output: textOutput(),
    async execute(args) {
      return json(await runAgent(client, args, config))
    },
  }))

  ctx.tools.register(defineTool({
    name: 'openclaw_team_continue',
    description: 'Continue or steer an existing OpenClaw enterprise-team session without creating a second task state.',
    parameters: {
      sessionKey: { type: 'string', required: true, description: 'The session key returned by openclaw_team_start.' },
      message: { type: 'string', required: true, description: 'Follow-up instruction, correction or approval response.' },
    },
    output: textOutput(),
    async execute(args) {
      return json(await continueAgent(client, args, config))
    },
  }))
}
