#!/usr/bin/env bash
set -euo pipefail

NAME="${1:?Usage: setup.sh <worktree-name>}"

resolve_orca() {
    if [ -n "${ORCA_CLI_COMMAND:-}" ]; then
        read -r -a ORCA_CMD <<< "$ORCA_CLI_COMMAND"
    elif [ -n "${ORCA_DEV_REPO_ROOT:-}" ]; then
        ORCA_CMD=(orca-dev)
    elif [ "$(uname -s)" = Linux ]; then
        ORCA_CMD=(orca-ide)
    else
        ORCA_CMD=(orca)
    fi
}

fallback_git() {
    local base_branch repo_root repo_parent repo_name branch_slug worktree_path

    base_branch=$(git symbolic-ref refs/remotes/origin/HEAD --short 2>/dev/null || true)
    if [ -z "$base_branch" ]; then
        echo "ERROR: Could not determine base branch" >&2
        exit 1
    fi
    git fetch -q origin 2>/dev/null || true

    if git show-ref --verify --quiet "refs/heads/${NAME}"; then
        local suffix=2
        while git show-ref --verify --quiet "refs/heads/${NAME}-v${suffix}"; do
            suffix=$((suffix + 1))
        done
        NAME="${NAME}-v${suffix}"
    fi

    repo_root=$(git rev-parse --show-toplevel)
    repo_parent=$(dirname "$repo_root")
    repo_name=$(basename "$repo_root")
    branch_slug=${NAME//\//-}
    worktree_path="$repo_parent/${repo_name}-${branch_slug}"

    git worktree add -b "$NAME" "$worktree_path" "$base_branch"
    printf 'WORKTREE_TOOL=git\nBRANCH_NAME=%s\nBASE_BRANCH=%s\nWORKTREE_PATH=%s\n' \
        "$NAME" "$base_branch" "$worktree_path"
}

resolve_orca
if command -v "${ORCA_CMD[0]}" >/dev/null 2>&1 &&
    "${ORCA_CMD[@]}" worktree current --json >/dev/null 2>&1; then
    if output=$("${ORCA_CMD[@]}" worktree create --name "$NAME" --setup skip --json); then
        if command -v jq >/dev/null 2>&1 && jq -e '.result.worktree.path and .result.worktree.id' >/dev/null <<< "$output"; then
            printf '%s\n' "$output" | jq -r '
                "WORKTREE_TOOL=orca",
                "BRANCH_NAME=" + (.result.worktree.branch // "" | sub("^refs/heads/"; "")),
                "BASE_BRANCH=" + (.result.worktree.baseRef // ""),
                "WORKTREE_PATH=" + .result.worktree.path,
                "WORKTREE_ID=" + .result.worktree.id
            '
            exit 0
        fi
        echo "ERROR: Orca create succeeded but returned unexpected JSON; refusing duplicate Git fallback." >&2
        exit 1
    fi
    echo "Orca worktree creation failed; using plain Git fallback." >&2
else
    echo "Orca unavailable or current directory is not in an Orca-managed worktree; using plain Git fallback." >&2
fi

fallback_git
