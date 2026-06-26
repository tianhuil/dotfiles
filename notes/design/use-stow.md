## The core change

Stow replaces **copy** with **symlink**. Right now `setup.sh` `cp`s `home/*` over `~/` on every change, and `diff.sh` exists because the two copies drift. With stow, `~/.bashrc` *is* a symlink into the repo — edit once, live everywhere, no copy, no diff. You also gain per-package granularity: `stow zellij` installs only zellij.

The restructure is mechanical: the flat `home/` becomes per-package subdirs, each mirroring `$HOME` internally (the gist's `bash/`, `vim/` idea). Keep the existing `home/` as the **stow directory** so AGENTS.md's "`home/` = ground truth for `~/`" stays true — only the mechanism inside it changes.

## Target layout

`home/<pkg>/` mirrors `$HOME`. So `home/node/.nvm/default-packages` → `~/.nvm/default-packages`.

| Package | Contents (relative to pkg root) |
|---|---|
| `shell` | `.bashrc` `.bash_profile` `.zshrc` `.zshenv` `.zprofile` `.coreenv` `.corerc` `.inputrc` `.git-completion.sh` `.git-prompt.sh` `.config/shell/gcm_ai.sh` |
| `git` | `.gitconfig` `.gitignore_global` |
| `ssh` | `.ssh/{config,config.local,racknerd.pub}` |
| `node` | `.npmrc` `.nvm/default-packages` |
| `bun` | `.bunfig.toml` |
| `tmux` | `.tmux.conf` |
| `stubby` | `.stubby.yml` |
| `bin` | `.local/bin/setup_typescript_repo.py` `.local/share/biome.json` |
| `scripts` | `.scripts/*.sh` |
| `cursor` | `.cursor/{mcp.json,commands,rules}` |
| `zellij` | `.config/zellij/config.kdl` |
| `worktrunk` | `.config/worktrunk/{config.toml,layouts}` |
| `opencode` | `.config/opencode/**` *(`.agents/` content merged in — see below)* |
| `env` | `.env.local` |

Design notes:
- `shell` is one package (not separate `bash`/`zsh`) because the `.coreenv`/`.corerc` split is login-vs-interactive, not bash-vs-zsh — they're always used together.
- `node`/`bun` split: `.npmrc` + `.nvm/` → node; `.bunfig.toml` → bun (two different ecosystems/runtimes).
- `opencode` consolidates both `.config/opencode/` and the former `.agents/` content into a single `$HOME` target. Skills from both trees are merged under `.config/opencode/skills/` (no name collisions). The submodule `_shared/anthropics-skills` was relocated accordingly. opencode scans `.config/opencode/skills` recursively, so the merged skill set resolves correctly. The `~/.agents/` root is abandoned — if other agent tools reference it, symlink `~/.agents` → `~/.config/opencode` separately.

## `.stowrc` (in `home/`)

```
--target="$HOME"
--no-folding
```

`--no-folding` forces stow to create **real** shared dirs (`.config`, `.ssh`, `.local`, `.nvm`) and symlink only the individual managed leaves. This is mandatory for the `opencode` package, where opencode writes runtime files into `.config/opencode/`.

## New `setup.sh`

Replaces the 40-line `cp` script. `--restow` (`-R`) makes it idempotent:

```bash
#!/usr/bin/env bash
set -euo pipefail
command -v stow >/dev/null || { echo "Install stow first: brew install stow"; exit 1; }
cd "$(dirname "$0")/home"
PKGS=(shell git ssh node bun tmux stubby bin scripts cursor zellij worktrunk opencode env)
stow --restow "${PKGS[@]}"
# steps stow can't express
git config --global core.excludesfile ~/.gitignore_global
cd "$(dirname "$0")" && git submodule update --init --recursive
if [ -d ~/.config/opencode/plugins/open-queue ] && command -v bun >/dev/null 2>&1; then
  (cd ~/.config/opencode/plugins/open-queue && bun install && bun run build)
fi
command -v rtk >/dev/null 2>&1 && rtk init -g --opencode
echo "Stowed ${#PKGS[@]} packages → $HOME"
```

`diff.sh` is **deleted** — symlinks can't drift, so `git diff` is your drift check. The `chmod +x ~/.local/bin/*` step is gone too: those files are already `+x` in git (`file-size-diff.sh`, `setup_typescript_repo.py` all `rwxr-xr-x`), and stow preserves mode bits.

## Migration (one-time)

The trick is `--adopt`: it converts existing real files at `~` into symlinks in one pass, moving the live file into the package when they differ (live wins). Since `~` files are recent `cp` copies, they're identical:

```bash
brew install stow                       # apt install stow on Linux
cd ~/dotfiles
# 1. restructure home/ into the packages above (git mv, so history is kept)
# 2. adopt the existing ~ copies in place — no manual deletion needed:
( cd home && stow --target="$HOME" --no-folding --adopt shell git ssh node bun tmux \
      stubby bin scripts cursor zellij worktrunk opencode env )
# 3. verify
ls -l ~/.bashrc          # → .../home/shell/.bashrc
stow -t "$HOME" -n shell # dry-run, should be clean
```

## Risks / footguns

1. **`--no-folding` is non-negotiable** for `.config/.ssh/.local/.nvm` — without it you get whole-directory symlinks that break runtime tooling and bleed writes into the repo.
2. **The `opencode` package is the hardest.** `.config/opencode/` mixes source (`opencode.json`, `agents/`, `commands/`, `skills/`) with build output (`node_modules`, `bun.lock`, two git submodules: `_shared/anthropics-skills` and `open-queue`). With `--no-folding` only managed leaves symlink and `node_modules` stays runtime-generated (it doesn't exist on a fresh clone, so there's nothing to stow); the `bun install` build then runs at `~/.config/opencode/plugins/open-queue`, which is a symlink into the repo submodule — consistent. If you want node_modules excluded even after a local build, add `home/opencode/.stow-local-ignore` containing `node_modules`.
3. **Secrets** (`context7-api-key`, `zai-api-key`, `.env.local`, `config.local`) get symlinked — same exposure as today's `cp`; no regression, but worth a `.gitignore` review.
4. **AGENTS.md / README** need a rewrite: "edit in `home/`, run `setup.sh`" becomes "edit in the package dir; symlinks are live, re-run `setup.sh` only after adding a new package."

### Consolidating `.agents` into `.config/opencode`

The `opencode` package merges the former `.agents/` content into `.config/opencode/` so there is a single `$HOME` target. Mechanical moves during restructuring:

1. `git mv home/.agents/skills/_shared home/.config/opencode/skills/_shared` — relocates the office-tooling submodule
2. Update `.gitmodules` submodule path
3. `git mv home/.agents/.skill-lock.json home/.config/opencode/.skill-lock.json`
4. `git mv home/.agents/skills/<dir> home/.config/opencode/skills/` — each ported skill dir (agent-browser, docx, pdf, pptx, serena, xlsx, etc.)
5. Remove `home/.agents/` (stale dir)

⚠ Verify opencode's skill manager still reads `.skill-lock.json` from its new location under `.config/opencode/`. It was tracking `agent-browser` and `find-skills` installs; if the manager hardcodes `~/.agents/.skill-lock.json`, those registrations are orphaned.

## Decisions made

| Question | Choice | Rationale |
|---|---|---|
| Package at repo root or under `home/`? | Keep `home/` | Minimal churn, AGENTS.md stays accurate |
| Split bash/zsh or single `shell`? | Single `shell` | `.coreenv`/`.corerc` split is login-vs-interactive |
| Split node/bun? | Separate `node` + `bun` | Different runtimes; one pkg per tool |
| `ai` → `opencode` consolidate `.agents`? | Yes — merged into `.config/opencode/` | Single `$HOME` target; opencode scans recursively; `~/.agents/` root abandoned |
