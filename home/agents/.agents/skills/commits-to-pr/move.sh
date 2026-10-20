#!/usr/bin/env bash
# Move local main commits onto a new PR branch, publish PR, reset main.
# Usage: move.sh <branch> <title> <body>
# Called by the commits-to-pr skill; agent generates BRANCH/TITLE/BODY.
set -euo pipefail

BRANCH="${1:?Usage: move.sh <branch> <title> <body>}"
TITLE="${2:?missing <title>}"
BODY="${3:?missing <body>}"

die() { printf 'ERROR: %s\n' "$1" >&2; exit 1; }

# Step 1-2: repository facts and clean worktree.
test "$(git rev-parse --show-toplevel)" = "$(pwd -P)" || die "not at repo toplevel: $(pwd -P)"
test "$(git branch --show-current)" = main || die "current branch is not main"
git show-ref --verify --quiet refs/remotes/origin/main || die "no refs/remotes/origin/main"
gh auth status >/dev/null 2>&1 || die "gh not authenticated"
test -z "$(git status --porcelain)" || die "worktree not clean; commit first (never stashed by this script)"

# Step 3: refresh remote, record source, require strictly ahead.
git fetch origin main
OLD_HEAD="$(git rev-parse main)"
git merge-base --is-ancestor origin/main "$OLD_HEAD" || die "local main is not ahead of origin/main (diverged?)"
test "$(git rev-list --count "origin/main..$OLD_HEAD")" -gt 0 || die "local main has no commits beyond origin/main"

# Step 5: PR branch must be unused locally and on the remote.
git show-ref --verify --quiet "refs/heads/$BRANCH" && die "local branch already exists: $BRANCH"
git ls-remote --exit-code --heads origin "refs/heads/$BRANCH" >/dev/null 2>&1 && die "remote branch already exists: $BRANCH"

# Step 6: create PR branch at recorded commit and publish.
git switch -c "$BRANCH" "$OLD_HEAD" || die "branch create failed; main untouched"
git push --set-upstream origin "$BRANCH" || die "push failed; main untouched, branch $BRANCH left local"

# Step 7: create PR. On failure leave main untouched.
gh pr create --base main --head "$BRANCH" --title "$TITLE" --body "$BODY" ||
    die "PR creation failed; main untouched, branch $BRANCH pushed"

# Step 8: only after PR exists, reset local main.
git switch main
git reset --hard origin/main

# Step 9: verify final state.
test "$(git branch --show-current)" = main || die "final branch is not main"
test "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" || die "main != origin/main after reset"
test "$(git rev-parse "$BRANCH")" = "$OLD_HEAD" || die "$BRANCH != OLD_HEAD"

printf 'BRANCH=%s\nOLD_HEAD=%s\nMAIN_HEAD=%s\n' "$BRANCH" "$OLD_HEAD" "$(git rev-parse HEAD)"
gh pr view "$BRANCH" --json number,url,state,headRefName,baseRefName
