---
name: dotfiles-agent-skills-cli
description: Managing ~/.agents/skills via the `skills` CLI and setup_skills.sh in the dotfiles repo. Use when adding a new remote skill (anthropics/skills, lavish-axi, orca-cli, etc.), understanding the ~/.agents/.skill-lock.json refresh model, or the three skill classes (whole-repo wildcard remote, named remote, repo-versioned local symlink). Covers adding skills by editing the REMOTE_SKILLS / LOCAL_SKILLS arrays in setup_skills.sh.
---

# Agent Skills via the `skills` CLI (`setup_skills.sh`)

`setup.sh` runs `setup_skills.sh`, which manages `~/.agents/skills/` — the shared
Agent Skills dir that pi reads directly. **Declarative names, not vendored content:**

the lock file `~/.agents/.skill-lock.json` maps each skill name → source repo + hash,
and every `setup.sh` run refreshes lock-tracked skills to latest via `npx skills update`.

Three classes, all declared in `setup_skills.sh`:

| Class | Mechanism | Declared in |
|-------|-----------|-------------|
| Whole-repo wildcard (anthropics: `pdf`, `docx`, … — rolling set) | `"anthropics/skills:*"` | `REMOTE_SKILLS` array |
| Named remote (`lavish`, `orca-cli`) | `"kunchenguid/lavish-axi:lavish"`, `"stablyai/orca:orca-cli"` | `REMOTE_SKILLS` array |
| Repo-versioned custom skills | symlinked from `home/opencode/.config/opencode/skills/` | `LOCAL_SKILLS` array |

To add a new remote skill, append `"<owner>/<repo>:<skill>"` to `REMOTE_SKILLS` and
re-run `./setup.sh`. The CLI installs under the `cline` agent alias (its global dir
is `~/.agents/skills/`; pi has no alias but reads that dir).
