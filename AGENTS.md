# Dotfiles Architecture

## Directory

The `./home` folder the ground truth for `~/.`.

It is setup by `./setup.sh`, which will:

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

## OpenCode Agents and Skills

### Agents
Located in `home/.opencode/agents/`, these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills following best practices from both opencode.ai and Claude documentation.

### Skills
Located in `home/.opencode/skills/<name>/SKILL.md`, these are globally installed to `~/.config/opencode/skills/<name>/SKILL.md` and available across all projects.

**Available Skills**:
- `git-commit`: Generate descriptive git commit messages by analyzing staged changes
- `dotfiles-setup`: Manage dotfiles repository structure and setup
- `typecheck-lint`: Run type checking and linting on codebases
- `github-pr`: Create and manage GitHub pull requests using gh CLI
- `merge-conflict`: Resolve git merge conflicts safely

Skills are loaded automatically by the `skill` tool when agents need them. Each skill includes YAML frontmatter with name, description, and optional metadata.
