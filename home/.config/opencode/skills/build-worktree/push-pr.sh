#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:?Usage: push-pr.sh <branch> <title> <body>}"
TITLE="${2:?Usage: push-pr.sh <branch> <title> <body>}"
BODY="${3:?Usage: push-pr.sh <branch> <title> <body>}"

if ! git remote get-url origin &>/dev/null; then
    echo "NO_REMOTE"
    exit 0
fi

git push -u origin "$BRANCH_NAME" 2>&1

PR_URL=$(gh pr create --title "$TITLE" --body "$BODY" 2>&1)

echo "$PR_URL"

PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')
echo "PR_NUMBER=${PR_NUMBER}"
