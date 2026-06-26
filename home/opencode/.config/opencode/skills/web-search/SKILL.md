---
name: web-search
description: Search the web using the web-search-prime MCP server via mcpc CLI. Use when the user needs to search the web for information, find current events, look up facts, or research topics online. Triggers include requests to "search the web", "look up", "find information about", "what's the latest on", or any task requiring web search results.
allowed-tools: Bash(mcpc *)
---

# Web Search via mcpc

Search the web using the [web-search-prime](https://z.ai) MCP server through `mcpc`.

## Prerequisites

- `mcpc` installed globally (`npm install -g @apify/mcpc`)
- `ZAI_API_KEY` set (see API Keys table in AGENTS.md)

## Setup

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

## Usage

```bash
mcpc @web tools-call web_search_prime search_query:="YOUR QUERY"
```

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `search_query` | Yes | The search query string (max 70 chars recommended) |
| `search_domain_filter` | No | Restrict to specific domain (e.g. `www.example.com`) |
| `search_recency_filter` | No | Time range: `oneDay`, `oneWeek`, `oneMonth`, `oneYear`, `noLimit` |
| `content_size` | No | Summary size: `medium` (400-600 words) or `high` (2500 words) |
| `location` | No | Region: `cn` (Chinese) or `us` (non-Chinese) |

### Examples

```bash
mcpc @web tools-call web_search_prime search_query:="bun runtime benchmarks"

mcpc @web tools-call web_search_prime search_query:="next.js 15 release" search_recency_filter:="oneWeek"

mcpc @web tools-call web_search_prime search_query:="react server components" search_domain_filter:="react.dev"

mcpc @web tools-call web_search_prime search_query:="AI agents 2026" content_size:="high"

mcpc --json @web tools-call web_search_prime search_query:="opencode CLI"
```

## Session Management

```bash
mcpc                                          # List active sessions
mcpc @web                                     # Show session info
mcpc @web tools-list                          # List available tools
mcpc close @web                               # Close session
mcpc clean sessions                           # Clean stale sessions
```

## Tips

- The `@web` session persists across calls — no need to reconnect each time
- Use `--json` for machine-readable output
- Session auth is stored in OS keychain automatically
- If session is stale, run `mcpc connect /tmp/mcp-servers.json:web-search-prime @web` to reconnect
- Warm calls take ~2s (0.3s CLI overhead + ~1.5s API latency)
