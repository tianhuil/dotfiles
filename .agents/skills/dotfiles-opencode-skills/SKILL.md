---
name: dotfiles-opencode-skills
description: Dotfiles-specific guidance for OpenCode agents and shared skills. Use when changing home/opencode/.config/opencode/agents/, opencode.json, the shared home/agents/.agents/skills/ tree, setup_skills.sh, or the Anthropic skills submodule. For general skill ownership, installation, updates, and audits, first use skill-management.
---

# Dotfiles OpenCode skills

Use `home/agents/.agents/skills/skill-management/SKILL.md` for the general workflow. This skill only records the dotfiles-specific layout and exceptions.

## Repository layout

- OpenCode agents live in `home/opencode/.config/opencode/agents/`.
- Shared repo-owned skills live in `home/agents/.agents/skills/`.
- `home/agents/.agents/skills/` is the source of truth; GNU Stow exposes it at `~/.agents/skills/`.
- Both pi and OpenCode discover shared skills from `~/.agents/skills/`.
- Do not edit live files under `~/.agents/skills/`; edit the repository source.
- The OpenCode package intentionally has no duplicate skills directory.

Unlike the generic `skill-management` example, repo-owned skills here are stowed directly by skill name rather than placed under `.agents/skills/local/`.

## Installation exception

This repository installs external skills into the shared global directory through `setup_skills.sh`, using its `REMOTE_SKILLS` declarations. Keep external skills there rather than vendoring them into `home/agents/.agents/skills/`.

The setup script is still needed because this repository:

- installs a shared global set for pi and OpenCode, not only project-local skills;
- supports wildcard remote collections;
- removes CLI ownership and stale lock entries before Stow claims repo-owned names; and
- refreshes remote skills during `./setup.sh`.

If the repository moves to project-local `skills-lock.json` installs, remove this exception and follow `skill-management` instead.

After adding a repo-owned skill, run `./setup.sh` so Stow exposes it. The setup script derives repo-owned names from the directory, so no second registry is required.

## MCP skills

These shared skills use persistent mcpc sessions:

| Skill | Session | Server |
|---|---|---|
| `sequential-thinking` | `@think` | `sequential_thinking` |
| `web-search` | `@web` | `web-search-prime` |
| `serena` | `@serena` | `serena` |

Read the relevant skill for authentication and session operations before changing one.

## Shared upstream scripts

Office and web-testing skills reference the submodule at:

`home/agents/.agents/skills/_shared/anthropics-skills/`

Update that submodule from its directory when intentionally refreshing the ported skills. Inspect the resulting diff before accepting upstream changes.
