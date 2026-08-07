---
name: dotfiles-agent-skills-cli
description: Managing ~/.agents/skills via the `skills` CLI, setup_skills.sh, and the `agents` stow package in the dotfiles repo. Use when adding a new remote skill (anthropics/skills, lavish-axi, orca-cli, etc.), understanding the ~/.agents/.skill-lock.json refresh model, or the two skill classes (CLI-installed remote vs repo-versioned skills stowed from the opencode skills dir). Covers adding skills by editing the REMOTE_SKILLS array in setup_skills.sh or adding a symlink under home/agents/.agents/skills/.
---

# Agent Skills via the `skills` CLI (`setup_skills.sh`)

`setup.sh` runs `setup_skills.sh` **before** stow; together they manage
`~/.agents/skills/` — the shared Agent Skills dir that pi reads directly.
**Remote skills are declarative names, not vendored content**: the lock file
`~/.agents/.skill-lock.json` maps each skill name → source repo + hash, and every
`setup.sh` run refreshes lock-tracked skills to latest via `npx skills update`.

Two classes, declared in `setup_skills.sh` / `home/agents/`:

| Class | Mechanism | Declared in |
|-------|-----------|-------------|
| Whole-repo wildcard (anthropics: `pdf`, `docx`, … — rolling set) | `"anthropics/skills:*"` | `REMOTE_SKILLS` array |
| Named remote (`lavish`, `orca-cli`) | `"kunchenguid/lavish-axi:lavish"`, `"stablyai/orca:orca-cli"` | `REMOTE_SKILLS` array |
| Repo-versioned skills (opencode skills shared with pi) | `agents` stow package: `home/agents/.agents/skills/<name>` symlinks the opencode source → `~/.agents/skills/<name>` | `home/agents/.agents/skills/` (stowed via `agents` in `PKGS`) |

For the repo-versioned class, `setup_skills.sh` only clears CLI lock entries + installed
copies before stow runs, so `skills update` can never clobber the stowed repo versions.

To add a new **remote** skill, append `"<owner>/<repo>:<skill>"` to `REMOTE_SKILLS` and
re-run `./setup.sh`. The CLI installs under the `cline` agent alias (its global dir
is `~/.agents/skills/`; pi has no alias but reads that dir).

To add a new **repo-versioned** skill (shared with pi from the opencode skills dir):

1. Add it under `home/opencode/.config/opencode/skills/<name>/SKILL.md` (see the
   dotfiles-opencode-skills skill).
2. Symlink it into the `agents` stow package:
   `cd home/agents/.agents/skills && ln -s ../../../opencode/.config/opencode/skills/<name> <name>`
3. Re-run `./setup.sh` — stow exposes it at `~/.agents/skills/<name>`; the
   setup_skills.sh cleanup loop derives names from the repo (any dir with a SKILL.md),
   so nothing else needs editing.
