# Dotfiles Architecture

## Overview

This repository manages personal configuration files (dotfiles) using a **perfect mapping** pattern: the `home/` directory mirrors the target `~/` (home) directory structure. Running `setup.sh` copies everything into place.

## How It Works

### 1. Source of Truth: `home/`

All config files live under `home/`, organized to mirror where they'll be installed:

```
home/.zshrc          → ~/.zshrc
home/.gitconfig      → ~/.gitconfig
home/.cursor/mcp.json → ~/.cursor/mcp.json
home/.local/bin/*    → ~/.local/bin/*
home/.config/        → ~/.config/
```

### 2. Installation:

- `setup.sh`: A straightforward shell script that copies files from `home/` to `~/` in two passes:
- `diff.sh`: Compares the repo versions in `home/` against what's currently installed in `~/`. Useful for seeing what would change before running `setup.sh`. Note: it only covers individual files, not directories.

> **Destructive**: `setup.sh` overwrites existing files without prompting. Use `diff.sh` first to review changes.

### 3. Special Mappings

| Source (`home/`) | Target (`~/`) | Notes |
|---|---|---|
| `.bashrc` | `~/.bashrc` + `~/.bash_profile` | Copied twice for macOS login shell compat |
| `.config/` | `~/.config/` | XDG-compliant config dir |
| `.local/` | `~/.local/` | XDG-compliant local data (bins, shared data) |

### 4. Managed Configs

**Shell**: zsh (`.zshrc`, `.zprofile`), bash (`.bashrc`, `.bash_profile`), readline (`.inputrc`)

**Git**: `.gitconfig`, `.gitignore_global`, completion/prompt scripts

**Editors/Tools**: Cursor (`.cursor/`), Kilocode (`.kilocode/`), tmux (`.tmux.conf`), OpenCode (`.config/opencode/`)

**Dev**: NVM (`.nvm/`), npm (`.npmrc`), stubby DNS (`.stubby.yml`), utility scripts (`.scripts/`)

**Binaries**: `~/.local/bin/` — executable scripts following XDG conventions
