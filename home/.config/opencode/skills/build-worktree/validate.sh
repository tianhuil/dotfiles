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
    echo "=== Running: $cmd ==="
    if ! (cd "$WORKTREE" && eval "$cmd" 2>&1); then
        echo "FAILED: $cmd"
        ALL_PASSED=false
        FAILED_CMDS+=("$cmd")
    else
        echo "PASSED: $cmd"
    fi
    echo ""
done

if [ "$ALL_PASSED" = true ]; then
    echo "ALL VALIDATIONS PASSED"
    exit 0
else
    echo "FAILED COMMANDS:"
    printf '  - %s\n' "${FAILED_CMDS[@]}"
    exit 1
fi
