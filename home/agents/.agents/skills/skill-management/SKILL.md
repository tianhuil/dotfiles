---
name: skill-management
description: Manages agent skills across project and user scopes. Use when installing, updating, restoring, organizing, ignoring, or reviewing skills; when deciding whether a skill belongs in Git; or when reconciling skills across Pi and other agent harnesses.
---

# Skill management

Keep three classes separate:

- **Local skills**: authored for this repository or user; source files are reviewed and committed when they are part of the project.
- **External project skills**: installed from a repository for this project; installed files stay local, while their source and pinned state are recorded in the CLI lockfile.
- **Pi packages**: reusable bundles of extensions, skills, prompts, or themes managed by Pi settings and `pi install`.

## Manage project skills

1. Inspect the repository before changing it:
   - Read `AGENTS.md`, `CLAUDE.md`, `README.md`, `.gitignore`, `package.json`, and any existing skill lockfile.
   - Run `npx skills list` and `pi list` when available.
   - Identify which skills are authored locally and which were installed externally.
2. Choose one source of truth per class:
   - For `npx skills` project installs, commit `skills-lock.json` and use these commands:
     ```bash
     npx skills experimental_install
     npx skills update -p -y
     ```
   - `package.json`: add only optional convenience scripts:
     ```json
     {
       "scripts": {
         "skills:update": "skills update -p -y",
         "skills:install": "skills experimental_install"
       }
     }
     ```
   - For Pi packages, commit project `.pi/settings.json` when the package should be shared. Pin Git refs or npm versions when reproducibility matters.
   - For local skills, commit the reviewed `SKILL.md` and supporting files.
3. Keep generated files out of Git. Put repository-authored skills in a clearly named allowlisted directory such as `.agents/skills/local/<name>/` when the harness recursively discovers skills. Keep generated agent symlinks ignored.
4. Install only the requested external skills. Prefer explicit skill selection over installing an entire repository when the CLI supports `--skill`.
5. Review every external `SKILL.md` and executable before use. Skills can direct the agent to run arbitrary commands.
6. Update through the owning tool, then inspect the diff:
   - `pi update --extensions` or `pi update <package>` for Pi packages.
7. Verify discovery from the actual project directory. Check that local and external skills have unique names and that their `SKILL.md` files have valid frontmatter.

## Git layout

Use a `.gitignore` inside each skills directory, not a broad rule in the repository root. This keeps the policy beside the generated files and makes local skills visible by default.

For Pi project skills, create `.agents/skills/.gitignore`:

```gitignore
# Ignore installed project skills; restore them from skills-lock.json.
*
!.gitignore

# Keep repository-authored skills.
!local/
!local/**
```

Then put custom skills here:

```text
.agents/skills/local/review-checklist/SKILL.md
.agents/skills/local/release-notes/SKILL.md
```

Pi discovers these nested directories recursively. If custom skills must live directly under `.agents/skills/`, allowlist each one instead:

```gitignore
*
!.gitignore
!commit-push-deploy/
!commit-push-deploy/**
!my-team-skill/
!my-team-skill/**
```

For Claude Code symlinks, create `.claude/skills/.gitignore` with the same pattern. Usually only the symlinks are generated, so keep `.claude/skills/` ignored locally and commit the source skill under `.agents/skills/local/`.

## Bridge Claude Code with a small CLAUDE.md

Do not duplicate project instructions in `CLAUDE.md`: Claude Code reads `AGENTS.md` natively. It does not index `.agents/skills/`, so when symlinks are unwanted, commit this one-pointer `CLAUDE.md` at the repo root:

```markdown
# Agent configuration

- Treat `AGENTS.md` at the repo root as your project instructions.
- Project skills live in `.agents/skills/**/SKILL.md` (including `local/`). They are not registered in Claude Code's skill list. When a task may match a skill, search that tree, read the matching `SKILL.md`, and follow it.
```

Use the pointer only for on-demand skill use. When a skill must activate without being named, add a flat symlink `.claude/skills/<name>` → `.agents/skills/local/<name>` instead: Claude Code auto-loads skills only from that one level.

## Discovery rules to respect

- Pi honors ignore files inside the skills tree (`.gitignore`, `.ignore`, `.fdignore`) and never the repository-root `.gitignore`. Never expect a vendor skill hidden by the catch-all above to load in Pi — load it with `pi --skill <path>` or install it as a Pi package. Claude Code ignores `.gitignore` entirely.
- Pi recurses into `.agents/skills/` subdirectories and stops recursing at any directory containing `SKILL.md`. Claude Code reads only one level under `.claude/skills/`.
- Pi scans `.agents/skills/` from the working directory up to the git repository root (to the filesystem root when there is no repo).
- Keep local and vendor skill names unique: on collision, Pi silently keeps the first discovered skill.

## Supporting files

Read these only when changing this skill or investigating discovery behavior:

- `research.md` — verification evidence: claim matrix, CLI versions, CLAUDE.md pointer experiments.
- `tests/skill-claims-test.sh` — re-runs every claim against the installed `pi` and `claude` CLIs (`--pi`, `--claude`, `--online` for the `npx skills` lockfile test).

Keep `skills-lock.json` tracked. Do not ignore the whole parent directory from the repository root: that hides local skills and makes accidental omission easy. Check the result with:

```bash
git check-ignore -v .agents/skills/resend/SKILL.md
git status --short
```

The first path should be ignored; a custom path such as `.agents/skills/local/review-checklist/SKILL.md` should appear as trackable.

## Completion criteria

Finish only when the source of truth is identified, generated files are ignored, local skills remain trackable, external skills can be restored, and discovery has been verified from the project directory. Report any unreviewed executable content or name collisions as residual risks.

## References

- [Agent Skills specification](https://agentskills.io/specification)
- [Pi skills docs](https://pi.dev/docs/latest/skills)
- [Claude Code skills docs](https://code.claude.com/docs/en/skills)
- [Anthropic skills collection](https://github.com/anthropics/skills)
- [skills CLI — `npx skills`, owns `skills-lock.json`](https://github.com/vercel-labs/skills)
