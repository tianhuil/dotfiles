---
name: sequential-thinking
description: >-
  Multi-step reasoning via the sequential_thinking MCP server through mcpc.
  Use when breaking down complex problems, planning, analyzing with revision,
  or any task needing structured multi-step thinking. The server maintains
  thought history across calls within a session. Triggers include complex
  analysis, planning tasks, problems requiring course correction, and any
  reasoning that benefits from explicit step-by-step decomposition.
allowed-tools: Bash(mcpc *)
---

# Sequential Thinking via mcpc

Structured multi-step reasoning using the [sequential-thinking](https://github.com/wemake-services/sequential-thinking) MCP server through `mcpc`.

## Prerequisites

- `mcpc` installed globally (`npm install -g @apify/mcpc`)
- `bun` installed (for the sequential-thinking stdio server)

## Setup

Create a session (one-time per conversation):

```bash
mcpc connect /tmp/mcp-servers.json:sequential_thinking @think 2>/dev/null || {
  cat > /tmp/mcp-servers.json << 'EOF'
{
  "mcpServers": {
    "sequential_thinking": {
      "command": "bunx",
      "args": ["-y", "@wemake.cx/sequential-thinking@latest"]
    }
  }
}
EOF
  mcpc connect /tmp/mcp-servers.json:sequential_thinking @think
}
```

## Usage

```bash
mcpc @think tools-call sequentialthinking \
  thought:="Your thinking step here" \
  nextThoughtNeeded:=true \
  thoughtNumber:=1 \
  totalThoughts:=5
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `thought` | Yes | Current thinking step |
| `nextThoughtNeeded` | Yes | `true` if more steps needed, `false` when done |
| `thoughtNumber` | Yes | Current step number |
| `totalThoughts` | Yes | Estimated total steps (adjustable) |
| `isRevision` | No | `true` if revising a previous thought |
| `revisesThought` | No | Which thought number to revise |
| `branchFromThought` | No | Branch point thought number |
| `branchId` | No | Branch identifier |
| `needsMoreThoughts` | No | `true` if more steps needed beyond estimate |

### Example: 3-step analysis

```bash
mcpc @think tools-call sequentialthinking \
  thought:="First, I need to understand the problem scope." \
  nextThoughtNeeded:=true thoughtNumber:=1 totalThoughts:=3

mcpc @think tools-call sequentialthinking \
  thought:="Now I'll analyze the tradeoffs of each approach." \
  nextThoughtNeeded:=true thoughtNumber:=2 totalThoughts:=3

mcpc @think tools-call sequentialthinking \
  thought:="Based on the analysis, approach B is best because..." \
  nextThoughtNeeded:=false thoughtNumber:=3 totalThoughts:=3
```

### Example: Revision

```bash
mcpc @think tools-call sequentialthinking \
  thought:="Wait, I assumed X but that's wrong. Let me reconsider..." \
  nextThoughtNeeded:=true thoughtNumber:=4 totalThoughts:=5 \
  isRevision:=true revisesThought:=2
```

## Session Management

```bash
mcpc @think                                    # Show session info
mcpc --json @think tools-call ...              # JSON output
mcpc close @think                              # Close when done
```

## Tips

- The session is **stateful** — thought history accumulates across calls
- Adjust `totalThoughts` up/down as reasoning evolves
- Use `--json` flag for machine-readable output
- Warm calls take ~0.3s (bridge keeps stdio process alive)
- Close the session when done to free resources: `mcpc close @think`
