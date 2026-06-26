# Dotfiles Architecture

This repo saves important dotfiles into git, managed via GNU Stow.

## Directory

The `./home` folder is the **stow directory**. It contains per-package subdirs
(`shell/`, `git/`, `ssh/`, `opencode/`, …), each mirroring `$HOME` internally.
Running `./setup.sh` invokes `stow` to symlink each package's files into `~/`.

```
home/            ← stow root
  shell/
    .bashrc       → ~/.bashrc
    .coreenv      → ~/.coreenv
    …
  git/
    .gitconfig    → ~/.gitconfig
    …
  opencode/
    .config/opencode/…  → ~/.config/opencode/…
```

**Key property**: since symlinks replace copies, editing a file in `home/shell/.bashrc`
instantly changes `~/.bashrc` — no re-run needed. Re-run `./setup.sh` only after
adding a new package or file.

The setup script also handles steps stow can't express (gitconfig, submodule init,
plugin build, rtk integration).

## Viewing Changes

Symlinks can't drift, so `git diff` in the repo is your drift check. No `diff.sh`
needed.

## Shell Config Architecture

Shell config lives in `home/shell/` and is split into two files:

- **`home/shell/.coreenv`** — Environment variables. Sourced from `~/.zshenv` (zsh: all shells), `~/.bash_profile` (bash login), and `~/.bashrc` (bash interactive). Contents: `PATH`, `EDITOR`, `GOPATH`, `PYENV_ROOT`, `NVM_DIR`, `SSH_AUTH_SOCK`, brew paths, etc.
- **`home/shell/.corerc`** — Interactive-only config. Sourced from `~/.zshrc` (zsh interactive) and `~/.bashrc` (bash interactive). Contents: aliases, shell functions, completions.

| File | Sourced by | Purpose |
|------|-----------|--------|
| `~/.zshenv` → `.coreenv` | All zsh shells | Env vars everywhere |
| `~/.zshrc` → `.corerc` | Interactive zsh | Aliases, functions |
| `~/.bashrc` → `.coreenv` + `.corerc` | Interactive bash | Env + interactive |
| `~/.bash_profile` → `.bashrc` + `BASH_ENV` | Login bash | Interactive + script env |

## Adding to ~/ dotfiles

Add or edit files in the appropriate `home/<pkg>/` package dir, not in `~/.`.
Symlinks are live — the edit immediately applies.  Re-run `./setup.sh` only after
adding a new package or a new file to an existing package.

## OpenCode Agents and Skills

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

