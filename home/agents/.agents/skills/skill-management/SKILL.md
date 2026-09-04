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
   - For `npx skills` project installs, commit `skills-lock.json` and restore it with `npx skills experimental_install`.
   - For Pi packages, commit project `.pi/settings.json` when the package should be shared. Pin Git refs or npm versions when reproducibility matters.
   - For local skills, commit the reviewed `SKILL.md` and supporting files.
3. Keep generated files out of Git. Put repository-authored skills in a clearly named allowlisted directory such as `.agents/skills/local/<name>/` when the harness recursively discovers skills. Keep generated agent symlinks ignored.
4. Install only the requested external skills. Prefer explicit skill selection over installing an entire repository when the CLI supports `--skill`.
5. Review every external `SKILL.md` and executable before use. Skills can direct the agent to run arbitrary commands.
6. Update through the owning tool, then inspect the diff:
   - `npx skills update -p -y` for project skills.
   - `npx skills experimental_install` to restore the lockfile.
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

Keep `skills-lock.json` tracked. Do not ignore the whole parent directory from the repository root: that hides local skills and makes accidental omission easy. Check the result with:

```bash
git check-ignore -v .agents/skills/resend/SKILL.md
git status --short
```

The first path should be ignored; a custom path such as `.agents/skills/local/review-checklist/SKILL.md` should appear as trackable.

## Completion criteria

Finish only when the source of truth is identified, generated files are ignored, local skills remain trackable, external skills can be restored, and discovery has been verified from the project directory. Report any unreviewed executable content or name collisions as residual risks.
