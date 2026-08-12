---
name: web-search-setup
description: One-time install/setup of the web-search MCP server (web-search-prime via mcpc) and its @web session. ONLY needed for install — run once to install mcpc, set ZAI_API_KEY, and connect the @web session. Do NOT use this for day-to-day searching; use the web-search skill (or the built-in web_search tool) instead.
allowed-tools: Bash(mcpc *), Bash(npm install *)
---

# Web Search — One-Time Setup

Installs and connects the [web-search-prime](https://z.ai) MCP server that the
**web-search** skill talks to through `mcpc`. Run this once; afterward use the
web-search skill (or the built-in `web_search` tool) for searching.

## Prerequisites

- `mcpc` installed globally (`npm install -g @apify/mcpc`)
- `ZAI_API_KEY` set (see API Keys table in AGENTS.md)

## Install & connect

```bash
export ZAI_API_KEY=$(tr -d '\n\r' < ~/.config/opencode/zai-api-key)
mcpc connect /tmp/mcp-servers.json:web-search-prime @web 2>/dev/null || {
  cat > /tmp/mcp-servers.json << 'EOF'
{
  "mcpServers": {
    "web-search-prime": {
      "url": "https://api.z.ai/api/mcp/web_search_prime/mcp",
      "headers": {
        "Authorization": "Bearer ${ZAI_API_KEY}"
      }
    }
  }
}
EOF
  mcpc connect /tmp/mcp-servers.json:web-search-prime @web
}
```

## Verify

```bash
mcpc @web tools-list
```

If the `@web` session ever goes stale, re-run the `mcpc connect ... @web` line
above to reconnect (or just re-run this skill).
