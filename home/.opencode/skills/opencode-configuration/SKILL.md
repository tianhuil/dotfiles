---
name: opencode-configuration
description: Configure OpenCode settings, providers, models, agents, and skills. Use when setting up OpenCode in a repo or globally, or when troubleshooting configuration issues.
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: configuration
---

# OpenCode Configuration

Configure OpenCode through JSON config files in different locations.

## Quick Start

Create a basic config file:

**Global config** (`~/.config/opencode/opencode.json`):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "opencode",
  "model": "anthropic/claude-sonnet-4-5",
  "autoupdate": true
}
```

**Project config** (`opencode.json` in project root):
```json
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5"
}
```

## Configuration Locations and Precedence

Configs are **merged together**, not replaced. Precedence order (later overrides earlier):

1. **Remote config** (`.well-known/opencode`) - organizational defaults
2. **Global config** (`~/.config/opencode/opencode.json`) - user preferences
3. **Custom config** (`OPENCODE_CONFIG` env var) - custom overrides
4. **Project config** (`opencode.json` in project) - project-specific
5. **`.opencode` directories** - agents, commands, plugins
6. **Inline config** (`OPENCODE_CONFIG_CONTENT` env var) - runtime overrides

### Global Configuration

Location: `~/.config/opencode/opencode.json`

Use for:
- User-wide preferences (themes, providers, keybinds)
- Default models and agents
- Global tool permissions
- Shared formatters and commands

### Project Configuration

Location: `opencode.json` in project root

Use for:
- Project-specific models
- Custom agents and commands
- Project-specific tools and permissions
- Instructions and rules

OpenCode searches from current directory up to git worktree.

### Custom Configuration Path

```bash
export OPENCODE_CONFIG=/path/to/custom-config.json
opencode
```

### Custom Directory

```bash
export OPENCODE_CONFIG_DIR=/path/to/config-directory
opencode
```

## Common Configuration Options

### Models and Providers
```json
{
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000,
        "setCacheKey": true
      }
    }
  }
}
```

### Provider Filtering
```json
{
  "disabled_providers": ["openai", "gemini"]
}
```
```json
{
  "enabled_providers": ["anthropic", "openai"]
}
```
Note: `disabled_providers` takes priority over `enabled_providers`.

### Theme and Agent
```json
{
  "theme": "opencode",
  "default_agent": "plan"
}
```

### Permissions
```json
{
  "permission": {
    "edit": "ask",
    "bash": "ask",
    "write": "allow",
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask"
    }
  }
}
```

### Commands and Agents
```json
{
  "command": {
    "test": {
      "template": "Run tests and show coverage",
      "description": "Run test suite",
      "agent": "build"
    }
  },
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices",
      "prompt": "Focus on security, performance, maintainability",
      "tools": {
        "write": false,
        "edit": false
      }
    }
  }
}
```

### Instructions, Formatters, Watcher
```json
{
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md"],
  "formatter": {
    "prettier": {
      "disabled": true
    }
  },
  "watcher": {
    "ignore": ["node_modules/**", "dist/**", ".git/**"]
  }
}
```

### Plugins, TUI, Server, Compaction
```json
{
  "plugin": ["opencode-helicone-session", "@my-org/custom-plugin"],
  "tui": {
    "scroll_speed": 3,
    "scroll_acceleration": { "enabled": true }
  },
  "server": {
    "port": 4096,
    "mdns": true,
    "cors": ["http://localhost:5173"]
  },
  "compaction": {
    "auto": true,
    "prune": true,
    "reserved": 10000
  },
  "share": "manual"
}
```
Sharing options: `"manual"`, `"auto"`, `"disabled"`

## Variable Substitution

### Environment Variables

```json
{
  "model": "{env:OPENCODE_MODEL}",
  "provider": {
    "anthropic": {
      "options": {
        "apiKey": "{env:ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### File Contents

```json
{
  "instructions": ["./custom-instructions.md"],
  "provider": {
    "openai": {
      "options": {
        "apiKey": "{file:~/.secrets/openai-key}"
      }
    }
  }
}
```

## Provider Configuration

### Quick Setup

Run `/connect` in the TUI to add provider credentials quickly.

### Environment Variables

Common provider environment variables:

```bash
# Anthropic
ANTHROPIC_API_KEY=sk-...

# OpenAI
OPENAI_API_KEY=sk-...

# Google Vertex AI
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id

# Azure OpenAI
AZURE_RESOURCE_NAME=your-resource

# Amazon Bedrock
AWS_PROFILE=my-profile
AWS_REGION=us-east-1
```

### Detailed Provider Examples

See [reference/providers.md](reference/providers.md) for detailed configuration examples for:
- Amazon Bedrock (profiles, VPC endpoints, custom inference)
- Azure OpenAI and Cognitive Services
- Google Vertex AI
- Anthropic and OpenAI
- OpenCode Zen
- Custom OpenAI-compatible providers
- Local models (Ollama, LM Studio, llama.cpp)
- GitLab Duo (self-hosted instances)
- GitHub Copilot
- Cloudflare AI Gateway
- Helicone (with custom headers)
- Vercel AI Gateway
- OpenRouter

## Directory Structure

OpenCode loads resources from these directories:

**Project-local** (walks up to git worktree):
- `.opencode/` - agents, commands, modes, plugins, skills, tools, themes
- `.claude/` - Claude-compatible skills
- `.agents/` - Agent-compatible skills

**Global**:
- `~/.config/opencode/` - agents, commands, modes, plugins, skills, tools, themes
- `~/.claude/` - Claude-compatible skills
- `~/.agents/` - Agent-compatible skills

Note: Use **plural** names for subdirectories: `agents/`, `commands/`, `skills/`, etc.

## Authentication Storage

Credentials added via `/connect` are stored in:
```
~/.local/share/opencode/auth.json
```

## Troubleshooting

### Quick Checks

**Config not loading?**
- Verify file location (global: `~/.config/opencode/opencode.json`, project: `opencode.json`)
- Validate JSON syntax
- Check `$schema` is correct

**Provider not working?**
- Run `opencode auth list` to verify credentials
- Check environment variables
- Verify provider ID matches

**Skills not showing?**
- Verify `SKILL.md` is spelled in all caps
- Check frontmatter includes `name` and `description`
- Ensure skill names are unique

**Models not available?**
- Run `/models` to see available models
- Verify provider credentials
- Check `enabled_providers` and `disabled_providers`

### Detailed Troubleshooting

See [reference/troubleshooting.md](reference/troubleshooting.md) for comprehensive troubleshooting guides:
- Configuration issues
- Provider problems
- Skills not loading
- Models unavailable
- Commands not working
- Agent issues
- Permission problems
- Common error messages
- Debug mode setup

### View Loaded Config

Run `/config` in the TUI to see the merged configuration from all sources.

## Best Practices

### Organize Config

- Use global config for personal preferences
- Use project config for team-specific settings
- Keep secrets in environment variables or separate files
- Use comments in JSONC files for documentation

### Security

- Never commit API keys to repo
- Use `{env:VAR_NAME}` or `{file:path/to/secret}` for sensitive data
- Set appropriate permissions for tools
- Review skill permissions regularly

### Team Setup

- Commit `opencode.json` for shared project settings
- Use `enabled_providers` to restrict available providers
- Define project-specific agents and commands
- Add `instructions` for team coding standards

## Complete Example

```json
{
  "$schema": "https://opencode.ai/config.json",
  "theme": "opencode",
  "model": "anthropic/claude-sonnet-4-5",
  "small_model": "anthropic/claude-haiku-4-5",
  "default_agent": "build",
  "autoupdate": true,
  "provider": {
    "anthropic": {
      "options": {
        "timeout": 600000
      }
    }
  },
  "enabled_providers": ["anthropic", "openai"],
  "permission": {
    "bash": "ask",
    "edit": "allow"
  },
  "agent": {
    "code-reviewer": {
      "description": "Reviews code for best practices and potential issues",
      "prompt": "Focus on security, performance, and maintainability.",
      "tools": {
        "write": false,
        "edit": false
      }
    }
  },
  "command": {
    "test": {
      "template": "Run tests and show coverage",
      "description": "Run test suite"
    }
  },
  "instructions": ["CONTRIBUTING.md"],
  "formatter": {
    "prettier": {
      "disabled": false
    }
  }
}
```

## Documentation Links

- [Full Config Schema](https://opencode.ai/config.json)
- [Providers](https://opencode.ai/docs/providers)
- [Skills](https://opencode.ai/docs/skills)
- [Agents](https://opencode.ai/docs/agents)
- [Commands](https://opencode.ai/docs/commands)
- [Permissions](https://opencode.ai/docs/permissions)
- [MCP](https://opencode.ai/docs/mcp-servers/)
