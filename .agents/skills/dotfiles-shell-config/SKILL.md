---
name: dotfiles-shell-config
description: Editing shell config in the dotfiles repo. Use when changing environment variables (PATH, EDITOR, GOPATH, PYENV_ROOT, NVM_DIR, SSH_AUTH_SOCK, brew paths), aliases, shell functions, or completions, or any ~/.zshrc / ~/.zshenv / ~/.bashrc / ~/.bash_profile wiring. Covers the .coreenv (env vars, all shells) vs .corerc (interactive only) split and the full sourcing matrix.
---

# Shell Config Architecture

Shell config lives in `home/shell/` and is split into two files:

- **`home/shell/.coreenv`** — Environment variables. Sourced from `~/.zshenv` (zsh: all shells), `~/.bash_profile` (bash login), and `~/.bashrc` (bash interactive). Contents: `PATH`, `EDITOR`, `GOPATH`, `PYENV_ROOT`, `NVM_DIR`, `SSH_AUTH_SOCK`, brew paths, etc.
- **`home/shell/.corerc`** — Interactive-only config. Sourced from `~/.zshrc` (zsh interactive) and `~/.bashrc` (bash interactive). Contents: aliases, shell functions, completions.

| File | Sourced by | Purpose |
|------|-----------|--------|
| `~/.zshenv` → `.coreenv` | All zsh shells | Env vars everywhere |
| `~/.zshrc` → `.corerc` | Interactive zsh | Aliases, functions |
| `~/.bashrc` → `.coreenv` + `.corerc` | Interactive bash | Env + interactive |
| `~/.bash_profile` → `.bashrc` + `BASH_ENV` | Login bash | Interactive + script env |
