# OpenClaw Enterprise AI Team Bridge for DeepSeek Harness

Connect DeepSeek Harness (DSH) to a real OpenClaw enterprise AI team.

DSH is the conversational interface. OpenClaw remains the source of truth for agents, skills, tools, memory, permissions, approvals, sessions and execution state. This plugin does not create a second agent team inside DSH.

> Status: experimental alpha. DeepSeek Harness is still a release candidate and its plugin APIs may change.

## What it provides

- `openclaw_team_health` — verify the OpenClaw Gateway through a minimal, redacted health projection
- `openclaw_team_list` — discover configured OpenClaw agents
- `openclaw_team_start` — start a task with an OpenClaw lead agent
- `openclaw_team_continue` — steer or continue the same OpenClaw session

Every task returns an OpenClaw `sessionKey`. DSH does not invent or persist a second task id.

## Requirements

- Node.js 22 or newer
- DeepSeek Harness `0.1.0-rc.7`
- OpenClaw CLI available on `PATH`
- A running, healthy OpenClaw Gateway
- At least one configured OpenClaw agent

## Install

From GitHub during alpha:

```bash
dsh plugin --profile web add dsh-openclaw-enterprise-team
```

From a release tarball:

```bash
dsh plugin --profile web add ./dsh-openclaw-enterprise-team-0.1.0-alpha.2.tgz
```

Verify that the bundle layer is active:

```bash
dsh --profile web --dump-config
```

## Configuration

Override the bundle row in the profile's `cordis.patch.yml` when needed:

```yaml
- id: openclaw-enterprise-team
  name: dsh-openclaw-enterprise-team
  config:
    openclawCommand: /absolute/path/to/openclaw
    defaultAgentId: main
    timeoutSeconds: 600
```

DSH patches replace the complete config object, so include every field when overriding it.

## Example

Ask DSH:

> Use `openclaw_team_start` to ask the OpenClaw enterprise team to research the DSH plugin ecosystem, retain sources, have an independent reviewer check the result, and return a publication-ready report.

Use the returned `sessionKey` with `openclaw_team_continue` for corrections, added requirements or approval responses.

## Architecture and security boundary

```text
DSH conversation
  -> this thin bridge
  -> OpenClaw CLI / Gateway
  -> OpenClaw lead agent
  -> OpenClaw agents, skills, memory, wiki, ontology and approvals
```

- No API key, token or cookie is stored by this package.
- Commands are executed with `execFile`, not a shell.
- Health responses omit channel accounts, plugin names, sessions and local runtime details.
- Agent lists omit local paths and model configuration.
- Agent results omit system prompts, workspace paths, model metadata and tool inventories.
- Command errors redact the home directory and credential-like values.
- OpenClaw authorization and approval policy remain authoritative.
- Removing this plugin does not remove OpenClaw sessions or enterprise data.
- Run DSH and OpenClaw under the same trusted OS account only when that trust boundary is intended.

## Development

```bash
npm install
npm test
npm run check
npm run pack:check
```

## Compatibility

| Plugin | DeepSeek Harness | OpenClaw |
|---|---|---|
| `0.1.0-alpha.2` | `0.1.0-rc.7` | `2026.7.1-2` tested |

## Uninstall

```bash
dsh plugin --profile web remove dsh-openclaw-enterprise-team
```

OpenClaw data is not touched.

## License

MIT
