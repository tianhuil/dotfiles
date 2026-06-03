# Dotfiles Architecture

This repo saves the important dotfiles into git.

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

## Adding to ~/ dotfiles

When adding to dotfiles, update them in `./home`, not in `~/.`.  Then tell the user to run `./setup.sh`.

The one exception is when the instructions use a CLI whose actions are mysterious.  In this case, consider adding those instructions to `./setup.sh`.

## OpenCode Agents and Skills

### Agents
Located in `home/.opencode/agents/`, these are reusable agent definitions.

**writing-skills.md**: Expert agent for creating opencode skills following best practices from both opencode.ai and Claude documentation

### Skills
Located in two directories (to be consolidated):

- **`home/.opencode/skills/<name>/SKILL.md`** — Original opencode-native skills. Globally installed to `~/.config/opencode/skills/<name>/SKILL.md` via `./setup.sh`.

- **`home/.agents/skills/<name>/SKILL.md`** — Ported skills from [anthropics/skills](https://github.com/anthropics/skills), adapted for opencode. These include `docx`, `pdf`, `pptx`, `xlsx`, `webapp-testing`, `theme-factory`, and `frontend-design`.

**Important:** Edit the skills in their `home/` source location, not `~/.config/`. They will be copied over by `./setup.sh`.

Skills are loaded automatically by the `skill` tool when agents need them. Each skill includes YAML frontmatter with name, description, and optional metadata.

**Notable skills:**

- **`curl-cffi`**: Impersonated web fetch via `uvx --from git+https://github.com/lexiforest/curl_cffi curl-cffi`. Replaces the `webfetch_camouflage` MCP — use when `web_fetch` is blocked or returns empty responses.

### Shared Scripts (Git Submodule)

Skills with Python scripts (docx, pdf, pptx, xlsx, webapp-testing) reference shared office tooling via a git submodule at `home/.agents/skills/_shared/anthropics-skills/`. The scripts are symlinked from each skill directory into the submodule.

To update the ported skills from upstream:

```bash
cd home/.agents/skills/_shared/anthropics-skills && git pull
```
