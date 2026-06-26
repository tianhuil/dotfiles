## API Keys

| Service | File | Env Var |
|---------|------|---------|
| z.ai (web-search-prime) | `~/.config/opencode/zai-api-key` | `ZAI_API_KEY` |
| Context7 | `~/.config/opencode/context7-api-key` | `CONTEXT7_API_KEY` |

Load with: `export KEY_NAME=$(tr -d '\n\r' < ~/.config/opencode/<file>)`

## mcpc Sessions

MCP servers are accessed via `mcpc` CLI (`npm install -g @apify/mcpc`) with persistent named sessions.

| Session | Server | Auth |
|---------|--------|------|
| `@think` | sequential_thinking (stdio) | None |
| `@web` | web-search-prime (remote) | `ZAI_API_KEY` |
| `@serena` | serena (local HTTP) | None |

Sessions persist across calls. Use `mcpc` to list, `mcpc close @name` to clean up.

---

You have access to some skills:

- `coding-standards`: Follow coding standards and best practices.  Read this before making any more edits to code.
- `merge-conflict`: Resolve git merge conflicts safely.  Read this whenever you need to do a merge conflict.
- `agent-browser`: vercel labs agent browser, replacement for playwright.  Use this skill whenever you need access to a browser.
- `find-docs`:  Use the `ctx7` CLI to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service -- even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. **ALWAYS:** read this skill before using `ctx7`.
- `serena`: Semantic code intelligence via `mcpc @serena`. **Strongly Prefer:** for symbol-level navigation, refactoring (rename, safe delete), finding references/implementations, replacing symbol bodies, and project memory. Prefer over text-based search-and-replace for structured code changes.
- `gh-grep`: Search real-world code on GitHub via `uvx mcp2cli --mcp https://mcp.grep.app`. Use when looking for usage examples of APIs/libraries, checking syntax, or finding production code patterns.
- `web-search`: Search the web via `mcpc @web`. Use when you need current information, facts, or research.
- `sequential-thinking`: Multi-step reasoning via `mcpc @think`. Use for complex analysis, planning, or any reasoning needing structured step-by-step decomposition. Maintains thought history across calls.


## Git Push
Use `gh` for all git operations. The correct push pattern is:
  gh auth setup-git && git push -u origin <branch>
If that fails, use: gh pr create --fill (which handles auth internally)
