---
name: dotfiles-opencode-skills
description: Editing OpenCode agents and skills in the dotfiles repo. Use when modifying home/opencode/.config/opencode/agents/ or opencode.json, or the shared skills in home/agents/.agents/skills/ (curl-cffi, the mcpc-based MCP skills sequential-thinking/web-search/serena, and the _shared/anthropics-skills git submodule backing docx/pdf/pptx/xlsx/webapp-testing scripts). Covers where to edit (home/agents/.agents/skills/, never the live ~/.agents/skills symlinks), the skills catalog, and updating ported skills from upstream.
---

# OpenCode Agents and Skills

### Agents
Located in `home/opencode/.config/opencode/agents/` (stowed to
`~/.config/opencode/agents/`), these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills.

### Skills
**All shared skills live in `home/agents/.agents/skills/`** — the single source of
truth, stowed to `~/.agents/skills/`. Both pi and opencode read that directory
natively (pi natively; opencode discovers agent-format skills from `~/.agents/`).
The opencode package (`home/opencode/.config/opencode/skills/`) intentionally has
**no skills directory** — no copies, no symlinks. `opencode.json` extends its
permission allowlist to `~/.agents/skills/**` so skill scripts can run.

| Origin | Included skills |
|--------|----------------|
| Repo-authored | `design`, `model-inventory`, `my-research`, `pi-package-publish` |
| Ported/customized from anthropics | `docx`, `pdf`, `pptx`, `xlsx`, `frontend-design`, `webapp-testing`, `theme-factory`, … |
| Opencode-flavored | `bun`, `coding-standards`, `drizzle-orm`, `nextjs-frontend`, `trpc`, `web-search`, … (~30) |
| CLI-installed (NOT in repo) | `agent-browser`, `find-skills` (vercel-labs), `research` (mattpocock) — installed by `setup_skills.sh` into `~/.agents/skills/` |

**Important:** Edit skills in `home/agents/.agents/skills/<name>/`, never in the live
`~/.agents/skills/<name>/` symlinks — stow propagates the change on next `setup.sh`.
Skills are loaded automatically by the `skill` tool when agents need them.

### Adding or Removing a Skill

- **Repo-versioned skill:** put the dir under `home/agents/.agents/skills/<name>/`
  with a `SKILL.md`; re-run `./setup.sh` (which runs `setup_skills.sh`, then stows
  `agents`). `setup_skills.sh` derives its repo-owned cleanup list from this dir
  automatically, so `skills update` can never clobber a stowed skill.
- **CLI-installable skill** (e.g. from vercel-labs, anthropics, mattpocock): add it
  to `REMOTE_SKILLS` in `setup_skills.sh` instead of vendoring it — see the
  `dotfiles-agent-skills-cli` skill.

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
`home/agents/.agents/skills/_shared/anthropics-skills/`. Each skill dir carries a
`scripts` symlink into `../_shared/anthropics-skills/skills/<name>/scripts`.

To update the ported skills from upstream:

```bash
cd home/agents/.agents/skills/_shared/anthropics-skills && git pull
```
