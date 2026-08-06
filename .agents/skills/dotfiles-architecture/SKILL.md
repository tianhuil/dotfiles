---
name: dotfiles-architecture
description: Editing the dotfiles repo's GNU Stow layout. Use when adding/editing files under home/<pkg>/, adding a new stow package, checking for config drift, or running setup.sh. Covers the home/ stow root, live symlinks, and the rule to edit home/<pkg>/ (not ~/).
---

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

## Adding to ~/ dotfiles

Add or edit files in the appropriate `home/<pkg>/` package dir, not in `~/.`.
Symlinks are live — the edit immediately applies.  Re-run `./setup.sh` only after
adding a new package or a new file to an existing package.
