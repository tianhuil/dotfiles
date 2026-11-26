#!/usr/bin/env bash
# Reports whether a checkout can run local-ci. LOCAL_CI is the command to run it, empty
# when missing: a dev dependency runs through the package manager, which puts
# node_modules/.bin on PATH for the Checks' bare commands; else a global install.
# SETUP lists what is missing, empty when ready.
set -euo pipefail

WORKTREE="${1:?Usage: local-ci-status.sh <worktree path>}"
cd "$WORKTREE"

package_manager() {
    local pm
    pm="$(jq -r '.packageManager // empty' package.json)"
    pm="${pm%%@*}"
    if [ -n "$pm" ]; then echo "$pm"
    elif [ -f pnpm-lock.yaml ]; then echo pnpm
    elif [ -f bun.lock ] || [ -f bun.lockb ]; then echo bun
    elif [ -f yarn.lock ]; then echo yarn
    else echo npm
    fi
}

SETUP=()
[ -f local-ci.yml ] || SETUP+=(config)

LOCAL_CI=""
if [ -f package.json ] && jq -e '.devDependencies["local-ci"]' package.json >/dev/null; then
    if [ -x node_modules/.bin/local-ci ]; then
        case "$(package_manager)" in
            pnpm) LOCAL_CI="pnpm exec local-ci" ;;
            bun) LOCAL_CI="bun run local-ci" ;;
            yarn) LOCAL_CI="yarn run local-ci" ;;
            *) LOCAL_CI="npx --no local-ci" ;;
        esac
    else
        SETUP+=(deps)   # declared but not installed: run the repo's install command
    fi
elif command -v local-ci >/dev/null; then
    LOCAL_CI="local-ci"
elif [ -f package.json ]; then
    SETUP+=(dev-dependency)
else
    SETUP+=(global)
fi

echo "LOCAL_CI=${LOCAL_CI}"
echo "SETUP=${SETUP[*]-}"
