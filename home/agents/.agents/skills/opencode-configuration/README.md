# OpenCode Configuration Skill

## Overview

This skill helps users configure OpenCode settings, providers, models, agents, and skills. It's designed for setting up OpenCode in a repository or globally, and for troubleshooting configuration issues.

## Files Created

### Main Skill
- **Location**: `home/.opencode/skills/opencode-configuration/SKILL.md`
- **Lines**: 419 (under the 500-line guideline)
- **Size**: 9.9 KB

### Reference Files
- **`reference/providers.md`** (7.3 KB): Detailed provider configuration examples for 15+ providers
- **`reference/troubleshooting.md`** (9.3 KB): Comprehensive troubleshooting guide

## Skill Features

### Quick Start
- Basic config examples for global and project setups
- Simple copy-paste configurations

### Configuration Locations
- Explains all 6 config sources and their precedence
- Global vs project vs custom configurations
- Directory structure for agents, commands, plugins, skills

### Configuration Options
- Models and providers (with examples)
- Provider filtering (enable/disable)
- Theme and default agent
- Tool and skill permissions
- Commands and agents
- Instructions, formatters, file watcher
- Plugins, TUI settings, server settings
- Compaction and sharing options

### Variable Substitution
- Environment variables (`{env:VAR_NAME}`)
- File contents (`{file:path/to/file}`)

### Provider Configuration
- Quick setup with `/connect`
- Common environment variables
- Link to detailed provider examples

### Directory Structure
- Project-local and global paths
- OpenCode, Claude, and Agent-compatible directories
- Plural naming convention for subdirectories

### Troubleshooting
- Quick checks for common issues
- Link to comprehensive troubleshooting guide
- `/config` command to view merged configuration

### Best Practices
- Config organization tips
- Security recommendations
- Team setup guidelines

### Complete Example
- Full working config combining all major options

## Usage

The skill is automatically loaded by the `skill` tool when needed. It includes:

**Name**: `opencode-configuration`
**Description**: Configure OpenCode settings, providers, models, agents, and skills. Use when setting up OpenCode in a repo or globally, or when troubleshooting configuration issues.

## Validation

### Naming Convention ✓
- Name: `opencode-configuration`
- Regex: `^[a-z0-9]+(-[a-z0-9]+)*$` ✓
- Length: 1-64 characters ✓
- Lowercase with single hyphens ✓
- Doesn't start or end with `-` ✓

### Frontmatter ✓
- `name`: Required ✓
- `description`: Required, 1-1024 chars ✓
- `license`: Optional (MIT) ✓
- `compatibility`: Optional (opencode) ✓
- `metadata`: Optional ✓

### Description ✓
- Written in third person ✓
- Includes both what the skill does and when to use it ✓
- Specific with key terms ✓
- Within character limit ✓

### Length Guidelines ✓
- Main skill: 419 lines (under 500) ✓
- Reference files: Detailed content in separate files ✓
- Progressive disclosure used ✓

### Structure ✓
- Clear sections with headers ✓
- Code examples throughout ✓
- Links to reference files ✓
- Links to official docs ✓
- Best practices included ✓

## Testing

To test the skill:

1. **Check skill discovery**:
   ```bash
   # Start OpenCode
   opencode

   # Run /skill command to see available skills
   /skill
   ```

2. **Load the skill**:
   ```
   Use skill tool: skill({ name: "opencode-configuration" })
   ```

3. **Verify skill content**:
   - Frontmatter is correctly parsed
   - All sections are accessible
   - Reference files are linked correctly

## Documentation Links

The skill references official OpenCode documentation:
- [Config Schema](https://opencode.ai/config.json)
- [Providers](https://opencode.ai/docs/providers)
- [Skills](https://opencode.ai/docs/skills)
- [Agents](https://opencode.ai/docs/agents)
- [Commands](https://opencode.ai/docs/commands)
- [Permissions](https://opencode.ai/docs/permissions)
- [Troubleshooting](https://opencode.ai/docs/troubleshooting)

## Installation

This skill is part of the dotfiles repository. After running `setup.sh`, it will be installed to:
```
~/.config/opencode/skills/opencode-configuration/SKILL.md
```

## Updates

To update this skill:
1. Edit files in `home/.opencode/skills/opencode-configuration/`
2. Run `./setup.sh` to copy to `~/.config/opencode/skills/`
3. Restart OpenCode to reload skills

## Contributing

When updating this skill:
- Keep main SKILL.md under 500 lines
- Use progressive disclosure for detailed content
- Include code examples with clear explanations
- Link to official documentation
- Follow skill naming and frontmatter conventions
- Validate JSON examples
- Test with actual OpenCode configuration

## Related Skills

- `dotfiles-setup` - For managing dotfiles repository structure
- `git-commit` - For generating commit messages
- `github-pr` - For creating pull requests
