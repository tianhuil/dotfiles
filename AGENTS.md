# Dotfiles Architecture

## Principles

This repository follows a **perfect mapping** architecture where the directory structure mirrors the home directory structure. This makes it easy to understand what files will be installed where.

- **Perfect Mapping**: Repository structure mirrors home directory structure (`repo/.foo/bar.txt` → `~/.foo/bar.txt`)
- **XDG Compliance**: Uses `.local/` for binaries and shared data following XDG Base Directory Specification
- **Consistency**: All config files follow Unix dotfile naming conventions
- **Minimal Transformations**: Special cases are kept to a minimum

## Directory Structure

```
home/
├─ .cursor/              → ~/.cursor/              (Cursor editor configs)
│  └─ commands/          → ~/.cursor/commands/    (Cursor AI commands)
│  └─ rules/             → ~/.cursor/rules/       (Cursor rules)
│  └─ mcp.json           → ~/.cursor/mcp.json     (Cursor MCP config)
├─ .kilocode/            → ~/.kilocode/            (AI tool configs)
├─ .local/               → ~/.local/               (XDG local data)
│  ├─ bin/               → ~/.local/bin/           (Executable scripts)
│  └─ share/             → ~/.local/share/        (Shared data files)
│     └─ .cursor-rules-typescript/
│     └─ .vscode-settings.json
│     └─ biome.json
├─ .nvm/                 → ~/.nvm/                 (Node version manager)
│  └─ default-packages
├─ .opencode/            → ~/.config/opencode/     (AI agent configs)
│  ├─ agents/
│  ├─ commands/
│  ├─ opencode.json
│  └─ (package files)
├─ .scripts/             → ~/.scripts/             (Utility scripts)
├─ .git-completion.sh    → ~/.git-completion.sh    (Git bash completion)
├─ .git-prompt.sh        → ~/.git-prompt.sh        (Git prompt for bash)
├─ .gitconfig            → ~/.gitconfig            (Git global config)
├─ .gitignore_global     → ~/.gitignore_global     (Global git ignores)
├─ .inputrc              → ~/.inputrc              (Readline config)
├─ .tmux.conf            → ~/.tmux.conf            (Tmux config)
├─ .zshrc                → ~/.zshrc                (Zsh config)
├─ .zprofile             → ~/.zprofile             (Zsh profile)
├─ .bashrc               → ~/.bashrc               (Bash config)
├─ .bash_profile         → ~/.bash_profile         (Bash profile - same source as .bashrc)
├─ .corerc               → ~/.corerc               (Core AI config)
├─ .npmrc                → ~/.npmrc                (Npm config)
└─ .stubby.yml           → ~/.stubby.yml           (Stubby DNS config)
```

## Installation

Run the setup script to copy all files to home directory:

```bash
./setup.sh
```

This will:
1. Copy all files from `home/` to `~/`
2. Recursively copy directories to their corresponding locations
3. Set appropriate permissions on executable files
4. Configure git to use the global ignore file

**Note**: This will overwrite existing files in your home directory.

## Viewing Changes

To see differences between repository files in `home/` and installed files:

```bash
./diff.sh
```

## Special Cases

- `.bashrc` is also copied to `~/.bash_profile` (for macOS login shells)
- `.opencode/` directory is copied to `~/.config/opencode/` (not `~/.opencode/`)

## OpenCode Agents and Skills

### Agents
Located in `home/.opencode/agents/`, these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills following best practices from both opencode.ai and Claude documentation.

### Skills
Located in `home/.opencode/skills/<name>/SKILL.md`, these are reusable behaviors that OpenCode agents can load on-demand.

**Available Skills**:
- `git-commit`: Generate descriptive git commit messages by analyzing staged changes
- `dotfiles-setup`: Manage dotfiles repository structure and setup
- `typecheck-lint`: Run type checking and linting on codebases
- `github-pr`: Create and manage GitHub pull requests using gh CLI
- `merge-conflict`: Resolve git merge conflicts safely
- `coding-standards`: Follow coding standards and best practices

Skills are loaded automatically by the `skill` tool when agents need them. Each skill includes YAML frontmatter with name, description, and optional metadata.
