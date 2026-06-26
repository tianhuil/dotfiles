#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:?Usage: setup.sh <branch-name>}"

BASE_BRANCH=$(git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null)
if [ -z "$BASE_BRANCH" ]; then
    echo "ERROR: Could not determine base branch" >&2
    exit 1
fi

git fetch -q origin 2>/dev/null

if git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}"; then
    SUFFIX=2
    while git show-ref --verify --quiet "refs/heads/${BRANCH_NAME}-v${SUFFIX}"; do
        SUFFIX=$((SUFFIX + 1))
    done
    BRANCH_NAME="${BRANCH_NAME}-v${SUFFIX}"
fi

WORKTREE_PATH=$(wt switch -c "$BRANCH_NAME" --base "$BASE_BRANCH" --no-cd --yes -x 'echo {{ worktree_path }}' 2>/dev/null | grep -v '^$' | tail -1)
if [ -z "$WORKTREE_PATH" ] || [ ! -d "$WORKTREE_PATH" ]; then
    echo "ERROR: Could not get worktree path from wt" >&2
    exit 1
fi

echo "BRANCH_NAME=${BRANCH_NAME}"
echo "BASE_BRANCH=${BASE_BRANCH}"
echo "WORKTREE_PATH=${WORKTREE_PATH}"
