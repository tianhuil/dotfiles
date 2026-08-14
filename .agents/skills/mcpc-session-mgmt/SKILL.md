---
name: mcpc-session-mgmt
description: Managing persistent mcpc sessions for MCP server access. Use when listing active mcpc sessions, closing stale sessions, reconnecting a session, setting up a new mcpc session, or understanding the mcpc CLI session model. Covers mcpc connect/disconnect/list/close commands, the named-session pattern (@think, @web, @serena), and how sessions persist across tool calls within an agent session.
---

# mcpc Session Management

[mcpc](https://github.com/apify/mcpc) (`npm install -g @apify/mcpc`) provides CLI
access to MCP servers through **persistent named sessions** (e.g. `@web`,
`@think`, `@serena`). Sessions stay alive across multiple tool calls within an
agent session — no per-call startup cost.

## Session Inventory

| Session | Server | Auth | Skill that uses it |
|---------|--------|------|-------------------|
| `@think` | sequential\_thinking (stdio) | None | `sequential-thinking` |
| `@web` | web-search-prime (remote) | `ZAI_API_KEY` | `web-search` |
| `@serena` | serena (local HTTP) | None | `serena` |

API keys live in `~/.config/opencode/` (see AGENTS.md there for the table).

## Commands

```bash
# List all active sessions
mcpc

# List tools available on a session
mcpc @<name> tools-list

# Close a stale session
mcpc close @<name>
```

## Connecting a Session

Sessions are created with `mcpc connect`. Each server definition comes from a
JSON config (e.g. `/tmp/mcp-servers.json`) or the OpenCode MCP config. See the
**web-search-setup** skill for a worked example of connecting `@web`.

General pattern:

```bash
mcpc connect <config>:<server-name> @<session-name>
```

If a session already exists, `mcpc connect` returns an error — close it first or
just use it as-is.

## When Sessions Go Stale

Long-running agent sessions may find that an mcpc session has disconnected (e.g.
the remote server timed out). Symptoms: tool calls hang or return connection
errors. Fix:

1. `mcpc close @<name>`
2. Re-run the `mcpc connect ...` command for that session
3. Verify with `mcpc @<name> tools-list`

## Relation to Individual Skills

Each mcpc-backed skill (sequential-thinking, web-search, serena) teaches *how to
use* that specific MCP server. This skill covers the *infrastructure* — the
mcpc CLI itself and session lifecycle management. Refer to individual skills
for server-specific usage patterns.
