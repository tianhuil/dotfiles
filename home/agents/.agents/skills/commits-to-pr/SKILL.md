---
name: commits-to-pr
disable-model-invocation: true
description: Move commits from local main onto a new GitHub PR branch, then reset local main to origin/main.
---

# Move local main commits into PR

Use only when local `main` contains commits that should become a GitHub PR targeting `main`, with local `main` reset to `origin/main`.

## Procedure

1. Check repository facts and dirty state yourself before invoking the script:

   ```bash
   test "$(git rev-parse --show-toplevel)" = "$PWD"
   test "$(git branch --show-current)" = main
   git status --porcelain
   ```

   This skill handles only local `main` against `origin/main`; do not adapt it to another branch or remote.

2. If status is non-empty, stop and show changes. Ask only whether the user intends to commit them (`yes`/`no`). If `no`, stop. If `yes`, generate the commit message yourself, incorporating any guidance the user provided. Never ask the user for a commit message. Never stash or discard changes.

3. Inspect the commits and generate all shell-safe text inputs yourself, incorporating any guidance the user provided (never ask the user for them):

   ```bash
   git fetch origin main
   git log --oneline --decorate origin/main..main
   ```

   - `BRANCH`: short slug, preferably `recovery/<short-slug>`
   - `TITLE` and `BODY`: summarize the commits

4. Run the script; it enforces every remaining check fail-closed (ahead-of-remote, branch collision, push, PR creation) and only resets `main` after the PR exists:

   ```bash
   ~/.agents/skills/commits-to-pr/move.sh "$BRANCH" "$TITLE" "$BODY"
   ```

   On any failure it stops with `ERROR: ...`, leaves `main` untouched, and reports the exact failure. It never stashes or discards changes.

5. Read its output for `BRANCH`, `OLD_HEAD`, `MAIN_HEAD`, and the `gh pr view` JSON. Do not duplicate or bypass its checks.

## Completion

Report PR branch, PR URL, original `main` commit, and final `main` commit. End with `Not verified` and list any checks not run or failures.
