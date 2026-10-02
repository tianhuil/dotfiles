#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:?Usage: push-pr.sh <branch> <title> <body>}"
TITLE="${2:?Usage: push-pr.sh <branch> <title> <body>}"
BODY="${3:?Usage: push-pr.sh <branch> <title> <body>}"

if ! git remote get-url origin &>/dev/null; then
    echo "NO_REMOTE"
    exit 0
fi

PUSH_LOG=$(mktemp)
if ! git push -u origin "$BRANCH_NAME" >"$PUSH_LOG" 2>&1; then
    cat "$PUSH_LOG"
    rm -f "$PUSH_LOG"
    exit 1
fi
rm -f "$PUSH_LOG"

# PR_DRAFT=1 opens a draft PR (used for BLOCKED or unreviewed work).
DRAFT_ARGS=()
if [ "${PR_DRAFT:-0}" = "1" ]; then
    DRAFT_ARGS=(--draft)
fi

if ! PR_URL=$(gh pr create ${DRAFT_ARGS[@]+"${DRAFT_ARGS[@]}"} --head "$BRANCH_NAME" --title "$TITLE" --body "$BODY" 2>&1); then
    # Most often the PR already exists; SKILL.md Step 4 updates it instead.
    echo "$PR_URL"
    exit 1
fi

echo "$PR_URL"

PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
echo "PR_NUMBER=${PR_NUMBER}"
