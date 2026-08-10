---
name: web-search
description: Default web-search skill — the first choice for any "search the web", "look up", "find information about", "what's the latest on", or general research request, using the web-search-prime MCP server through the mcpc CLI. It is also fine to use the built-in web_search tool directly — but please read this skill first. Prefer this over curl-cffi (use only when a specific URL is consistently blocked) and agent-browser (use only to take action on a page). One-time install/connect lives in the web-search-setup skill.
allowed-tools: Bash(mcpc *)
---

# Web Search via mcpc

Search the web using the [web-search-prime](https://z.ai) MCP server through `mcpc`.

## Using the built-in `web_search` tool

It's fine to use the built-in `web_search` tool directly instead of `mcpc`, but
**please read this section first.** By default `web_search` opens an interactive
localhost browser (the "curator" UI), which you almost never want when running
headless. Disable it by setting the `workflow` parameter:

```javascript
// Disables opening the localhost browser while still returning a summary
web_search({ query: "your query", workflow: "auto-summary" })

// Disables the curator UI and skips summary drafting entirely
web_search({ query: "your query", workflow: "none" })
```

Default to `workflow: "auto-summary"` (summary, no browser) or `workflow: "none"`
(no browser, no summary) on every `web_search` call so it never opens a browser
tab.

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
