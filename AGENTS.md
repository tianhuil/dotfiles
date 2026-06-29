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

## Oh My Pi

You may be Oh My Pi.

OMP bundles its documentation inline and renders pages via the `omp://` URI scheme from any tool's path argument — use `read("omp://<topic>")` to view docs on skills, extensions, settings, or slash commands without leaving the conversation. Project-level OMP skills live in `.omp/skills/<name>/SKILL.md` and are auto-discovered; edit them there, and they're available to every OMP session in this repo.

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

## OMP Config Validation via RPC

Changes to `config.yml`, `models.yml`, or extensions can silently break OMP
(load errors, unrecognized models, extension factory crashes). Validate with RPC:

```bash
# Pipe JSONL commands via stdin, capture all output
echo '{"id":"t1","type":"prompt","message":"/build-wt"}' | \
  omp --mode rpc --no-session --cwd /tmp > /tmp/rpc.jsonl

# Assertions
grep -q '"type":"extension_error"' /tmp/rpc.jsonl && echo "FAIL: extension error" || true
grep -q '"name":"build-wt"' /tmp/rpc.jsonl && echo "PASS: registered" || echo "FAIL: not found"
```

**Key signals** in the output:

| Frame | Meaning |
|-------|---------|
| `"type":"ready"` | Startup complete |
| `"type":"extension_error"` | **FAIL** — factory crashed |
| `"type":"available_commands_update"` | Startup burst includes all commands (no explicit `get_available_commands` needed) |
| `"prompt_result"` → `"agentInvoked": false` | Local-only command completed (no agent turn) |

**Critical flags:**
- `--no-session` — no session DB; startup faster, no stale state
- `--cwd /tmp` — isolates from project-level `.omp/extensions/` in the repo
- Use `--cwd <repo-root>` instead of `/tmp` when testing project-level config or extensions

`omp` reads JSONL from stdin sequentially. Startup frames emit *before* the first
stdin read, so piping one command at startup captures both the registration burst
and a handler smoke test in a single run. Pipe `echo` sends one frame then closes
stdin — omp sees EOF after processing it and exits cleanly.

## Validation

TypeScript changes are validated with:

```bash
bun typecheck
```

This runs `tsc --noEmit` against all `.ts` files in `home/` and `.omp/`.
Since `.config` is a hidden directory, the `include` patterns are explicit paths
rather than `**/*.ts` (which doesn't traverse hidden directories).

Always run `bun typecheck` after editing any `.ts` file in the repo.
