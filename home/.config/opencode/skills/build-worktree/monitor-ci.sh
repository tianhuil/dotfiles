#!/usr/bin/env bash
set -euo pipefail

BRANCH_NAME="${1:?Usage: monitor-ci.sh <branch> <pr_number>}"
PR_NUMBER="${2:-}"

wait_for_run() {
    local branch="$1"
    local attempt=0
    while [ $attempt -lt 30 ]; do
        local run_json
        run_json=$(gh run list --branch "$branch" --limit 1 --json databaseId,status,conclusion --jq '.[0]' 2>/dev/null || echo "null")
        if [ "$run_json" != "null" ] && [ "$run_json" != "" ]; then
            local status
            status=$(echo "$run_json" | jq -r '.status')
            if [ "$status" != "queued" ] && [ "$status" != "" ]; then
                echo "$run_json"
                return 0
            fi
        fi
        sleep 10
        attempt=$((attempt + 1))
    done
    echo "TIMEOUT"
    return 1
}

RUN_INFO=$(wait_for_run "$BRANCH_NAME")

if [ "$RUN_INFO" = "TIMEOUT" ]; then
    echo "TIMEOUT: No CI run appeared after 5 minutes"
    exit 1
fi

RUN_ID=$(echo "$RUN_INFO" | jq -r '.databaseId')
RUN_STATUS=$(echo "$RUN_INFO" | jq -r '.status')

if [ "$RUN_STATUS" = "completed" ]; then
    CONCLUSION=$(echo "$RUN_INFO" | jq -r '.conclusion')
    echo "CONCLUSION=${CONCLUSION}"
else
    echo "Watching CI run ${RUN_ID}..."
    if gh run watch "$RUN_ID" --exit-status 2>&1; then
        echo "CONCLUSION=success"
    else
        CONCLUSION=$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')
        echo "CONCLUSION=${CONCLUSION}"
    fi
fi

if [ -n "$PR_NUMBER" ]; then
    MERGE_STATE=$(gh pr view "$PR_NUMBER" --json mergeable,mergeStateStatus --jq '{mergeable, mergeStateStatus}' 2>/dev/null || echo "{}")
    MERGEABLE=$(echo "$MERGE_STATE" | jq -r '.mergeable // "UNKNOWN"')
    MERGE_STATE_STATUS=$(echo "$MERGE_STATE" | jq -r '.mergeStateStatus // "UNKNOWN"')
    echo "MERGEABLE=${MERGEABLE}"
    echo "MERGE_STATE_STATUS=${MERGE_STATE_STATUS}"

    if [ "$MERGEABLE" = "CONFLICTING" ] || [ "$MERGE_STATE_STATUS" = "DIRTY" ]; then
        echo "MERGE_CONFLICT=true"
        exit 0
    fi
fi

echo "RUN_ID=${RUN_ID}"
