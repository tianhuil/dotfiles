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
- `dotfiles-opencode-skills`
- `dotfiles-agent-skills-cli`
- `dotfiles-orca-bin`
- `dotfiles-omp-validation`
- `dotfiles-typecheck`

## Oh My Pi

This repo targets Oh My Pi (OMP), a pi fork. OMP skills live under `.omp/skills/`
— `omp` (orientation; read OMP docs via `read("omp://<topic>")`) and
`omp-extension-debug` (extension model-resolution debugging).
