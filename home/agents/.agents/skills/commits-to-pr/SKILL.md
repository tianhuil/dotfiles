---
name: commits-to-pr
disable-model-invocation: true
description: Move commits from local main onto a new GitHub PR branch, then reset local main to origin/main.
---

# Move local main commits into PR

Use only when local `main` contains commits that should become a GitHub PR targeting `main`, with local `main` reset to `origin/main`.

## Generated PR details

Generate these from the commits after inspecting them:

- PR branch name. Use a short, shell-safe slug, preferably `recovery/<short-slug>`.
- PR title and body. Summarize the commits; do not ask the user to provide them.

## Procedure

1. Check required repository facts before changing Git state:

   ```bash
   test "$(git rev-parse --show-toplevel)" = "$PWD"
   test "$(git branch --show-current)" = main
   git show-ref --verify --quiet refs/remotes/origin/main
   gh auth status
   ```

   Stop if any check fails. This skill handles only local `main` against `origin/main`; do not adapt it to another branch or remote.

2. Require a clean worktree:

   ```bash
   test -z "$(git status --porcelain)"
   ```

   If status is non-empty and the user has not indicated that they want to commit changes, stop and show changes. Ask whether they want to commit them first. If the user already indicated that intent, obtain any needed commit message, create the commit, and re-run from step 1. Never stash or discard changes.

3. Refresh remote state and record exact source commit:

   ```bash
   git fetch origin main
   OLD_HEAD="$(git rev-parse main)"
   git merge-base --is-ancestor origin/main "$OLD_HEAD"
   test "$(git rev-list --count origin/main..$OLD_HEAD)" -gt 0
   ```

   Stop if local `main` is not strictly ahead of `origin/main` or if histories diverged.

4. Inspect commits before naming PR:

   ```bash
   git log --oneline --decorate "origin/main..$OLD_HEAD"
   ```

   Generate shell-safe `BRANCH`, `TITLE`, and `BODY` from these commits.

5. Confirm PR branch is unused:

   ```bash
   if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
     printf 'Local branch already exists: %s\n' "$BRANCH" >&2
     exit 1
   fi
   if git ls-remote --exit-code --heads origin "refs/heads/$BRANCH" >/dev/null 2>&1; then
     printf 'Remote branch already exists: %s\n' "$BRANCH" >&2
     exit 1
   fi
   ```

   Stop on either collision.

6. Create PR branch at recorded commit and publish it:

   ```bash
   git switch -c "$BRANCH" "$OLD_HEAD"
   git push --set-upstream origin "$BRANCH"
   ```

   If either command fails, leave `main` untouched and report exact failure.

7. Create PR targeting `main`:

   ```bash
   gh pr create --base main --head "$BRANCH" --title "$TITLE" --body "$BODY"
   ```

   If PR creation fails, leave `main` untouched. Report branch and pushed commit; do not reset `main`.

8. Only after PR creation succeeds, reset local `main`:

   ```bash
   git switch main
   git reset --hard origin/main
   ```

9. Verify final state:

   ```bash
   test "$(git branch --show-current)" = main
   test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)"
   test "$(git rev-parse "$BRANCH")" = "$OLD_HEAD"
   git status --short --branch
   gh pr view "$BRANCH" --json number,url,state,headRefName,baseRefName
   ```

## Completion

Report PR branch, PR URL, original `main` commit, and final `main` commit. End with `Not verified` and list any checks not run or failures.
