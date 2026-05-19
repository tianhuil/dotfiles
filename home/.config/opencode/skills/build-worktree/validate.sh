#!/usr/bin/env bash
set -euo pipefail

WORKTREE="${1:?Usage: validate.sh <worktree path>}"

discover_commands() {
    local wt="$1"
    local cmds=()

    if [ -f "$wt/package.json" ]; then
        local scripts
        scripts=$(node -e "
            const p = JSON.parse(require('fs').readFileSync('$wt/package.json', 'utf8'));
            const s = p.scripts || {};
            ['test','lint','typecheck','check','validate','format','build'].forEach(k => {
                if (s[k]) console.log(k);
            });
        " 2>/dev/null || true)
        while IFS= read -r script; do
            [ -z "$script" ] && continue
            case "$script" in
                test) cmds+=("npm test") ;;
                lint) cmds+=("npm run lint") ;;
                typecheck) cmds+=("npm run typecheck") ;;
                check) cmds+=("npm run check") ;;
                validate) cmds+=("npm run validate") ;;
                format) cmds+=("npm run format") ;;
                build) cmds+=("npm run build") ;;
            esac
        done <<< "$scripts"
    fi

    if [ -f "$wt/pyproject.toml" ]; then
        if grep -q 'pytest\|mypy\|ruff' "$wt/pyproject.toml" 2>/dev/null; then
            grep -q 'pytest' "$wt/pyproject.toml" && cmds+=("python -m pytest")
            grep -q 'mypy' "$wt/pyproject.toml" && cmds+=("python -m mypy .")
            grep -q 'ruff' "$wt/pyproject.toml" && cmds+=("ruff check .")
        fi
    fi

    if [ ${#cmds[@]} -eq 0 ]; then
        echo "NO_COMMANDS_FOUND"
        return
    fi

    printf '%s\n' "${cmds[@]}"
}

COMMANDS=$(discover_commands "$WORKTREE")

if [ "$COMMANDS" = "NO_COMMANDS_FOUND" ]; then
    echo "SKIP: No validation commands discovered"
    exit 0
fi

ALL_PASSED=true
FAILED_CMDS=()

while IFS= read -r cmd; do
    [ -z "$cmd" ] && continue
    echo "=== Running: $cmd ==="
    if ! (cd "$WORKTREE" && eval "$cmd" 2>&1); then
        echo "FAILED: $cmd"
        ALL_PASSED=false
        FAILED_CMDS+=("$cmd")
    else
        echo "PASSED: $cmd"
    fi
    echo ""
done <<< "$COMMANDS"

if [ "$ALL_PASSED" = true ]; then
    echo "ALL VALIDATIONS PASSED"
    exit 0
else
    echo "FAILED COMMANDS:"
    printf '  - %s\n' "${FAILED_CMDS[@]}"
    exit 1
fi
