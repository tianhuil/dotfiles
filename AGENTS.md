# Dotfiles Architecture

## Principles

This repository follows a **perfect mapping** architecture where the directory structure mirrors the home directory structure. This makes it easy to understand what files will be installed where.

- **Perfect Mapping**: Repository structure mirrors home directory structure (`repo/.foo/bar.txt` → `~/.foo/bar.txt`)
- **XDG Compliance**: Uses `.local/` for binaries and shared data following XDG Base Directory Specification
- **Consistency**: All config files follow Unix dotfile naming conventions
- **Minimal Transformations**: Special cases are kept to a minimum

## Directory Structure

```
.cursor/              → ~/.cursor/              (Cursor editor configs)
  └─ commands/        → ~/.cursor/commands/    (Cursor AI commands)
  └─ rules/           → ~/.cursor/rules/       (Cursor rules)
.kilocode/            → ~/.kilocode/            (AI tool configs)
.local/               → ~/.local/               (XDG local data)
  ├─ bin/             → ~/.local/bin/           (Executable scripts)
  └─ share/           → ~/.local/share/        (Shared data files)
    └─ .cursor-rules-typescript/
    └─ .vscode-settings.json
    └─ biome.json
.nvm/                 → ~/.nvm/                 (Node version manager)
  └─ default-packages
.opencode/            → ~/.config/opencode/     (AI agent configs)
  ├─ agents/
  ├─ commands/
  ├─ opencode.json
  └─ (package files)
.scripts/             → ~/.scripts/             (Utility scripts)
.git-completion.sh    → ~/.git-completion.sh    (Git bash completion)
.git-prompt.sh        → ~/.git-prompt.sh        (Git prompt for bash)
.gitconfig            → ~/.gitconfig            (Git global config)
.gitignore_global     → ~/.gitignore_global     (Global git ignores)
.inputrc              → ~/.inputrc              (Readline config)
.tmux.conf            → ~/.tmux.conf            (Tmux config)
.zshrc                → ~/.zshrc                (Zsh config)
.zprofile             → ~/.zprofile             (Zsh profile)
.bashrc               → ~/.bashrc               (Bash config)
.bash_profile         → ~/.bash_profile         (Bash profile - same source as .bashrc)
.corerc               → ~/.corerc               (Core AI config)
.npmrc                → ~/.npmrc                (Npm config)
.stubby.yml           → ~/.stubby.yml           (Stubby DNS config)
.cursor-mcp.json      → ~/.cursor-mcp.json      (Cursor MCP config)
                      → ~/.cursor/mcp.json      (Secondary copy)
```

## Installation

Run the setup script to copy all files to home directory:

```bash
./setup.sh
```

This will:
1. Copy all top-level dotfiles to `~/`
2. Recursively copy directories to their corresponding locations
3. Set appropriate permissions on executable files
4. Configure git to use the global ignore file

**Note**: This will overwrite existing files in your home directory.

## Viewing Changes

To see differences between repository files and installed files:

```bash
./diff.sh
```

## Special Cases

- `.bashrc` is also copied to `~/.bash_profile` (for macOS login shells)
- `.cursor-mcp.json` is copied to both `~/.cursor-mcp.json` and `~/.cursor/mcp.json`
- `.opencode/` directory is copied to `~/.config/opencode/` (not `~/.opencode/`)
