#!/usr/bin/env bash
set -euo pipefail

WORKTREE="${1:?Usage: validate.sh <worktree path> <command...>}"
shift

if [ $# -eq 0 ]; then
    echo "SKIP: No validation commands provided"
    exit 0
fi

ALL_PASSED=true
FAILED_CMDS=()

for cmd in "$@"; do
    LOG=$(mktemp)
    if (cd "$WORKTREE" && eval "$cmd" >"$LOG" 2>&1); then
        echo "PASSED: $cmd"
    else
        echo "FAILED: $cmd"
        echo "--- Output ---"
        cat "$LOG"
        echo "---"
        ALL_PASSED=false
        FAILED_CMDS+=("$cmd")
    fi
    rm -f "$LOG"
done

if [ "$ALL_PASSED" = true ]; then
    echo "ALL VALIDATIONS PASSED"
    exit 0
else
    echo "FAILED COMMANDS:"
    printf '  - %s\n' "${FAILED_CMDS[@]}"
    exit 1
fi
