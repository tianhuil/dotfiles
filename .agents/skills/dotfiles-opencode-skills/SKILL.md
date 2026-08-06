---
name: dotfiles-opencode-skills
description: Editing OpenCode agents and skills in the dotfiles repo. Use when modifying home/opencode/.config/opencode/agents/ or skills/, the curl-cffi impersonated-fetch skill, the mcpc-based MCP skills (sequential-thinking, web-search, serena), or the _shared/anthropics-skills git submodule backing docx/pdf/pptx/xlsx/webapp-testing scripts. Covers where to edit (source dir, not the symlink), the skills catalog, and updating ported skills from upstream.
---

# OpenCode Agents and Skills

### Agents
Located in `home/opencode/.config/opencode/agents/` (stowed to
`~/.config/opencode/agents/`), these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills.

### Skills
All skills are consolidated under `home/opencode/.config/opencode/skills/`,
covering both opencode-native skills and ported skills from
[anthropics/skills](https://github.com/anthropics/skills):

| Origin | Included skills |
|--------|----------------|
| Opencode-native | `bun`, `coding-standards`, `drizzle-orm`, `nextjs-frontend`, `trpc`, `web-search`, … (~25) |
| Ported from anthropics | `docx`, `pdf`, `pptx`, `xlsx`, `frontend-design`, `agent-browser`, `serena`, … (~14) |

**Important:** Edit skills in their `home/opencode/.config/opencode/skills/<name>/` source,
not in `~/.config/opencode/skills/<name>/`.  The symlink propagates the change.

Skills are loaded automatically by the `skill` tool when agents need them.

**Notable skills:**

- **`curl-cffi`**: Impersonated web fetch via `uvx --from git+https://github.com/lexiforest/curl_cffi curl-cffi`. Replaces the `webfetch_camouflage` MCP — use when `web_fetch` is blocked or returns empty responses.

### mcpc-Based MCP Skills

Several skills use [mcpc](https://github.com/apify/mcpc) (`npm install -g @apify/mcpc`) to access MCP servers through CLI with persistent sessions:

| Skill | Session | MCP Server | Auth |
|-------|---------|------------|------|
| `sequential-thinking` | `@think` | sequential_thinking (stdio) | None |
| `web-search` | `@web` | web-search-prime (remote) | `ZAI_API_KEY` |
| `serena` | `@serena` | serena (local HTTP) | None |

API keys are stored in `~/.config/opencode/` (see AGENTS.md there for the table).

### Shared Scripts (Git Submodule)

Skills with Python scripts (docx, pdf, pptx, xlsx, webapp-testing) reference shared
office tooling via a git submodule at
`home/opencode/.config/opencode/skills/_shared/anthropics-skills/`. The scripts are
symlinked from each skill directory into the submodule.

To update the ported skills from upstream:

```bash
cd home/opencode/.config/opencode/skills/_shared/anthropics-skills && git pull
```
