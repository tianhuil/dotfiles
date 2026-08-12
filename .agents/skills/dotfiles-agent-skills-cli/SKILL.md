---
name: dotfiles-agent-skills-cli
description: Managing ~/.agents/skills via the `skills` CLI, setup_skills.sh, and the `agents` stow package in the dotfiles repo. Use when adding a new remote skill (anthropics/skills, lavish-axi, orca-cli, vercel-labs, etc.), understanding the ~/.agents/.skill-lock.json refresh model, or the two skill classes (CLI-installed remote vs repo-versioned skills stowed from home/agents/.agents/skills/). Covers adding skills by editing the REMOTE_SKILLS array in setup_skills.sh or adding a dir under home/agents/.agents/skills/.
---

# Agent Skills via the `skills` CLI (`setup_skills.sh`)

`setup.sh` runs `setup_skills.sh` **before** stow; together they manage
`~/.agents/skills/` — the shared Agent Skills dir that pi reads directly, and that
opencode also reads natively (agent-format skills from `~/.agents/`).
**Remote skills are declarative names, not vendored content**: the lock file
`~/.agents/.skill-lock.json` maps each skill name → source repo + hash, and every
`setup.sh` run refreshes lock-tracked skills to latest via `npx skills update`.

Two classes, declared in `setup_skills.sh` / `home/agents/`:

| Class | Mechanism | Declared in |
|-------|-----------|-------------|
| Whole-repo wildcard (anthropics, mattpocock — rolling set) | `"anthropics/skills:*"`, `"mattpocock/skills:*"` | `REMOTE_SKILLS` array |
| Named remote (`lavish`, `axi`, `orca-cli`, `agent-browser`, `find-skills`) | `"kunchenguid/lavish-axi:lavish"`, `"vercel-labs/agent-browser:agent-browser"`, … | `REMOTE_SKILLS` array |
| Repo-versioned skills | `agents` stow package: real dirs under `home/agents/.agents/skills/<name>` → stowed to `~/.agents/skills/<name>` | `home/agents/.agents/skills/` (stowed via `agents` in `PKGS`) |

`plannotator-*` are also CLI-managed, by the plannotator CLI itself (not the `skills`
CLI), and are left alone by `setup_skills.sh`.

For the repo-versioned class, `setup_skills.sh` only clears CLI lock entries + installed
copies before stow runs, so `skills update` can never clobber the stowed repo versions.

To add a new **remote** skill, append `"<owner>/<repo>:<skill>"` to `REMOTE_SKILLS` and
re-run `./setup.sh`. The CLI installs under the `cline` agent alias (its global dir
is `~/.agents/skills/`; pi has no alias but reads that dir).

To add a new **repo-versioned** skill (shared by pi and opencode):

1. Add the dir under `home/agents/.agents/skills/<name>/SKILL.md` (see the
   dotfiles-opencode-skills skill for the catalog and editing rules).
2. Re-run `./setup.sh` — stow exposes it at `~/.agents/skills/<name>`; the
   setup_skills.sh cleanup loop derives names from the repo (any dir with a SKILL.md),
   so nothing else needs editing.

**Rule of thumb:** if a skill can be installed via the `skills` CLI, keep it
CLI-installed (`REMOTE_SKILLS` entry, lock-tracked) — never vendor it into the repo.
Only repo-authored or customized skills belong under `home/agents/.agents/skills/`.
