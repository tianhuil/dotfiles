---
name: opencode-configuration
description: Configure OpenCode settings, providers, models, agents, mcp, and skills. Use when setting up OpenCode in a repo or globally, or when troubleshooting configuration issues.
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

## Markdown Agents

Agents can be defined as markdown files in the `agents/` directory with `.md` extension. Markdown agents provide more detailed prompts and metadata.

### Agent File Structure

Create `agents/my-agent.md`:

```markdown
---
name: my-agent
description: Agent description for task matching
agent_type: general
tools:
  read: true
  edit: true
  write: false
  bash: true
  glob: true
  grep: true
  webfetch: true
  task: true
---

# My Agent

You are an expert in domain-specific tasks.

## Guidelines

- Follow best practices for the specific domain
- Consider performance and maintainability
- Provide clear explanations

## Workflow

1. Understand the problem
2. Research solutions
3. Implement and verify
```

### Agent Frontmatter Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Unique agent identifier |
| `description` | string | When to use this agent (shown in TUI) |
| `agent_type` | string | `general`, `explore`, `research`, or `git` |
| `tools` | object | Tool permissions |
| `small_model` | string | Override small model for this agent |
| `model` | string | Override model for this agent |

### Using Agents in Config

Reference agents in `opencode.json`:

```json
{
  "agent": {
    "writing-assistant": {
      "description": "Helps with writing and editing tasks",
      "prompt": "You are a writing assistant. Help with grammar, clarity, and structure.",
      "tools": {
        "read": true,
        "write": true,
        "edit": true
      }
    },
    "explainer": {
      "description": "Explains code and concepts",
      "agent_type": "explore",
      "tools": {
        "read": true,
        "grep": true,
        "glob": true
      }
    }
  }
}
```

## Skills

Skills are reusable configurations that provide domain-specific instructions. They can be defined in config or as markdown files.

### Skill File Structure

Create `skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Does X for Y use cases. Use when specific condition.
license: MIT
compatibility: opencode
metadata:
  audience: users
  workflow: specific-task
---

# My Skill

## Quick Start

Brief usage example:

```bash
command-to-run
```

## Detailed Guide

Full documentation here.
```

### Skill Frontmatter Options

| Option | Type | Description |
|--------|------|-------------|
| `name` | string | Unique skill identifier (kebab-case) |
| `description` | string | What the skill does and when to use it |
| `license` | string | License (e.g., MIT, Apache-2.0) |
| `compatibility` | string | `opencode`, `claude`, or `agent` |
| `metadata` | object | Additional metadata |

### Skill Permissions in Config

```json
{
  "permission": {
    "skill": {
      "*": "allow",
      "internal-*": "deny",
      "experimental-*": "ask",
      "security-*": "deny"
    }
  }
}
```

Permission values:
- `allow` - Load immediately
- `deny` - Hidden from agent
- `ask` - Prompt for approval

### Loading Skills

Skills are automatically loaded when needed. Use the `skill` tool:

```markdown
Use the {name} skill to handle this task.
```

Or reference in agent config:

```json
{
  "agent": {
    "specialist": {
      "skills": ["my-skill", "other-skill"]
    }
  }
}
```

## Commands

Commands are slash-prefixed actions in the TUI. They can be simple config entries or complex markdown files.

### Simple Command Config

```json
{
  "command": {
    "test": {
      "template": "Run tests and show coverage",
      "description": "Run test suite with coverage report"
    },
    "lint": {
      "template": "Run {linter} on the codebase",
      "description": "Run linter",
      "agent": "build"
    },
    "deploy": {
      "template": "Deploy application to {environment}",
      "description": "Deploy to staging or production",
      "agent": "build",
      "variables": {
        "environment": {
          "type": "string",
          "options": ["staging", "production"],
          "default": "staging"
        }
      }
    }
  }
}
```

### Command Options

| Option | Type | Description |
|--------|------|-------------|
| `template` | string | Prompt template with {variables} |
| `description` | string | Shown in TUI command list |
| `agent` | string | Agent to use for this command |
| `variables` | object | Variable definitions with options |

### Markdown Command

For complex commands, create `commands/my-command.md`:

```markdown
---
name: my-command
description: Complex command with detailed instructions
agent: build
---

# My Command

Run a complex workflow with specific steps:

## Pre-checks

- Verify prerequisites
- Check permissions

## Steps

1. First action
2. Second action
3. Verify results

## Error Handling

If errors occur:
- Check logs
- Roll back if needed
```

### Command Directory Locations

**Project-local**:
- `.opencode/commands/` - OpenCode commands

**Global**:
- `~/.config/opencode/commands/`

### Built-in Commands

OpenCode provides built-in commands:
- `/config` - View merged configuration
- `/models` - List available models
- `/connect` - Add provider credentials
- `/auth` - Manage authentication
- `/skills` - List available skills
- `/agents` - List available agents

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
