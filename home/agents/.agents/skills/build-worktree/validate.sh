#!/usr/bin/env bash
# Runs each command in the worktree with pipefail, keeps its full log, and prints one
# `EXIT=<code> LOG=<path> CMD=<cmd>` line per command so callers quote an exit code
# instead of judging cut-off output.
set -uo pipefail

WORKTREE="${1:?Usage: validate.sh <worktree path> <command...>}"
shift

if [ $# -eq 0 ]; then
    echo "SKIP: No validation commands provided"
    exit 0
fi

LOG_DIR="${VALIDATE_LOG_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/validate.XXXXXX")}"
TAIL_LINES="${VALIDATE_TAIL_LINES:-40}"
mkdir -p "$LOG_DIR"
echo "LOG_DIR=$LOG_DIR"

FAILED_CMDS=()
i=0
for cmd in "$@"; do
    i=$((i + 1))
    LOG="$LOG_DIR/$i.log"
    (cd "$WORKTREE" && bash -o pipefail -c "$cmd") >"$LOG" 2>&1
    code=$?
    echo "EXIT=$code LOG=$LOG CMD=$cmd"
    if [ "$code" -ne 0 ]; then
        echo "--- last $TAIL_LINES lines of $LOG ---"
        tail -n "$TAIL_LINES" "$LOG"
        echo "---"
        FAILED_CMDS+=("$cmd")
    fi
done

if [ ${#FAILED_CMDS[@]} -eq 0 ]; then
    echo "ALL VALIDATIONS PASSED"
    exit 0
fi
echo "FAILED COMMANDS:"
printf '  - %s\n' "${FAILED_CMDS[@]}"
exit 1
