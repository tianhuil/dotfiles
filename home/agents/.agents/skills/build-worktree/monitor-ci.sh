#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:?Usage: monitor-ci.sh <branch> <pr_number> [commit_sha]}"
PR_NUMBER="${2:?Usage: monitor-ci.sh <branch> <pr_number> [commit_sha]}"
# Only accept a run for this exact commit; right after a push, the newest run
# on the branch can still be the previous commit's.
COMMIT_SHA="${3:-$(git rev-parse HEAD 2>/dev/null || true)}"
COMMIT_ARGS=()
if [ -n "$COMMIT_SHA" ]; then
    COMMIT_ARGS=(--commit "$COMMIT_SHA")
    echo "Waiting for CI on commit ${COMMIT_SHA}"
fi

latest_run() {
    gh run list --branch "$BRANCH_NAME" ${COMMIT_ARGS[@]+"${COMMIT_ARGS[@]}"} --limit 1 --json databaseId --jq '.[0].databaseId' 2>/dev/null || true
}

RUN_ID=$(latest_run)

if [ -z "$RUN_ID" ]; then
    echo "Waiting for CI run to appear..."
    for i in $(seq 1 30); do
        sleep 10
        RUN_ID=$(latest_run)
        [ -n "$RUN_ID" ] && break
    done
    if [ -z "$RUN_ID" ]; then
        echo "TIMEOUT: No CI run appeared after 5 minutes"
        exit 1
    fi
fi

echo "Watching CI run ${RUN_ID}..."
CI_LOG=$(mktemp)
if gh run watch "$RUN_ID" --exit-status >"$CI_LOG" 2>&1; then
    CONCLUSION=success
else
    CONCLUSION=$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')
    echo "--- CI Output ---"
    cat "$CI_LOG"
    echo "---"
fi
rm -f "$CI_LOG"
echo "CONCLUSION=${CONCLUSION}"

MERGE_STATE=$(gh pr view "$PR_NUMBER" --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}' 2>/dev/null || echo "{}")
MERGEABLE=$(echo "$MERGE_STATE" | jq -r '.mergeable // "UNKNOWN"')
MERGE_STATE_STATUS=$(echo "$MERGE_STATE" | jq -r '.mergeStateStatus // "UNKNOWN"')
echo "MERGEABLE=${MERGEABLE}"
echo "MERGE_STATE_STATUS=${MERGE_STATE_STATUS}"

if [ "$MERGEABLE" = "CONFLICTING" ] || [ "$MERGE_STATE_STATUS" = "DIRTY" ]; then
    echo "MERGE_CONFLICT=true"
    exit 0
fi

echo "RUN_ID=${RUN_ID}"
