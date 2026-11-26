#!/usr/bin/env bash
# Run from the worktree. Runs local-ci on HEAD: the local Run is the CI, mirrored to
# GitHub as one local-ci/<check> Commit Status per Check. Then checks mergeability.
set -euo pipefail

PR_NUMBER="${1:?Usage: run-local-ci.sh <pr_number> <commit_sha>}"
COMMIT_SHA="${2:?Usage: run-local-ci.sh <pr_number> <commit_sha>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(git rev-parse --show-toplevel)"
STATUS_OUT="$(bash "$SCRIPT_DIR/local-ci-status.sh" "$REPO_ROOT")"
LOCAL_CI="$(sed -n 's/^LOCAL_CI=//p' <<<"$STATUS_OUT")"
SETUP="$(sed -n 's/^SETUP=//p' <<<"$STATUS_OUT")"

if [ -n "$SETUP" ] || [ -z "$LOCAL_CI" ]; then
    echo "ERROR: local-ci is not ready (SETUP=${SETUP})"
    exit 1
fi
if [ "$(git rev-parse HEAD)" != "$COMMIT_SHA" ]; then
    echo "ERROR: HEAD is not ${COMMIT_SHA}; local-ci runs on HEAD"
    exit 1
fi

# Pushes (a no-op once pushed) and skips Checks that already passed on this commit.
echo "Running local-ci on ${COMMIT_SHA}"
LOCAL_CI_LOG=$(mktemp)
# LOCAL_CI is a command (e.g. "pnpm exec local-ci"): split it on purpose.
# shellcheck disable=SC2086
if (cd "$REPO_ROOT" && $LOCAL_CI) >"$LOCAL_CI_LOG" 2>&1; then
    CONCLUSION=success
else
    CONCLUSION=failure
fi
echo "--- local-ci output ---"
cat "$LOCAL_CI_LOG"
echo "---"
rm -f "$LOCAL_CI_LOG"
echo "LOCAL_CI_LOGS=$(git rev-parse --absolute-git-dir)/local-ci/logs/${COMMIT_SHA:0:7}"
echo "CONCLUSION=${CONCLUSION}"

MERGE_STATE=$(gh pr view "$PR_NUMBER" --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}' 2>/dev/null || echo "{}")
MERGEABLE=$(echo "$MERGE_STATE" | jq -r '.mergeable // "UNKNOWN"')
MERGE_STATE_STATUS=$(echo "$MERGE_STATE" | jq -r '.mergeStateStatus // "UNKNOWN"')
echo "MERGEABLE=${MERGEABLE}"
echo "MERGE_STATE_STATUS=${MERGE_STATE_STATUS}"

if [ "$MERGEABLE" = "CONFLICTING" ] || [ "$MERGE_STATE_STATUS" = "DIRTY" ]; then
    echo "MERGE_CONFLICT=true"
fi
