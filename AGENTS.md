# Dotfiles

This repo saves dotfiles into git, managed via **GNU Stow**. The `home/` directory
is the stow root: each subdir (`shell/`, `git/`, `opencode/`, …) mirrors `$HOME`
internally, and `./setup.sh` symlinks each package's files into `~/`.

**Core rule:** edit files in `home/<pkg>/`, never directly in `~/`. Symlinks are
live — an edit applies instantly; re-run `./setup.sh` only after adding a new
package or file. Drift check is just `git diff` (symlinks can't drift).

Detailed guidance for working in this repo lives in project skills under
`.agents/skills/` (auto-discovered; their full descriptions are injected into
context, so invoke by name):

- `dotfiles-architecture`
- `dotfiles-shell-config`
- `dotfiles-skills-management`
- `dotfiles-agent-skills-cli`
- `dotfiles-orca-bin`
- `dotfiles-omp-validation`
- `dotfiles-typecheck`

## API Keys


| Service                 | File                                  | Env Var            |
| ----------------------- | ------------------------------------- | ------------------ |
| z.ai (web-search-prime) | `~/.config/opencode/zai-api-key`      | `ZAI_API_KEY`      |
| Context7                | `~/.config/opencode/context7-api-key` | `CONTEXT7_API_KEY` |


Load with: `export KEY_NAME=$(tr -d '\n\r' < ~/.config/opencode/<file>)`