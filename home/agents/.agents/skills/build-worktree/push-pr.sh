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

PR_URL=$(gh pr create --title "$TITLE" --body "$BODY" 2>&1)

echo "$PR_URL"

PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
echo "PR_NUMBER=${PR_NUMBER}"
