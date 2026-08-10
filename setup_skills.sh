#!/usr/bin/env bash
set -euo pipefail

# Manage skills in ~/.agents/skills/ (the shared agent-skills dir that pi reads).
#
# pi has no agent alias in the `skills` CLI (it maps pi → ~/.pi/agent/skills/,
# which this build doesn't read). The CLI maps cline/warp/zed/loaf/dexto/kimi-code-cli
# to ~/.agents/skills/, so we install under "cline" and pi picks the skills up.
#
# Two ownership classes:
#   1. Remote skills from other repos (mattpocock/skills, axi, orca-cli) — declared in
#      REMOTE_SKILLS, installed via the `skills` CLI, lock-tracked, refreshed every run.
#   2. Repo-versioned skills (home/opencode/.config/opencode/skills/) — owned by the
#      `agents` stow package: home/agents/.agents/skills/<name> symlinks each skill into
#      the opencode source, and stow exposes it at ~/.agents/skills/<name> for pi.
#      This script's only job for them is to clear CLI lock entries + installed copies
#      before stow runs (setup.sh calls this script before stow), so `skills update`
#      can never clobber the stowed repo versions.
#
# plannotator-* skills are installed by the plannotator CLI itself and are left alone.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="cline"                  # CLI alias whose global dir is ~/.agents/skills/
DEST="$HOME/.agents/skills"
LOCAL_SRC="$SCRIPT_DIR/home/opencode/.config/opencode/skills"

# Remote skills to install/refresh on every setup.sh run. Format: "<repo>:<skill>".
# Use "<repo>:*" to install every skill a repo ships — a rolling set (the repo adds
# new skills without touching this file); named entries are pinned to exactly that skill.
REMOTE_SKILLS=(
  # "anthropics/skills:*"
  "kunchenguid/lavish-axi:lavish"
  "kunchenguid/axi:axi"
  "mattpocock/skills:*"
  "stablyai/orca:orca-cli"
)

if ! command -v npx >/dev/null 2>&1; then
  echo "WARNING: npx not found; skipping skills install" >&2
  exit 0
fi

has_skill() { [ -e "$DEST/$1" ]; }

mkdir -p "$DEST"

# Remote skills — install any that are missing (content comes from the CLI,
# lock-tracked for refresh below). `skills add` is idempotent, so wildcard repos are
# always (re)added — no per-repo gate needed.
for entry in "${REMOTE_SKILLS[@]}"; do
  repo="${entry%%:*}"
  name="${entry##*:}"
  if [ "$name" = "*" ]; then
    npx --yes skills add "$repo" --agent "$AGENT" --global --yes --skill '*' \
      || echo "WARNING: failed to install skills from $repo" >&2
  elif ! has_skill "$name"; then
    npx --yes skills add "$repo" --agent "$AGENT" --global --yes --skill "$name" \
      || echo "WARNING: failed to install skill '$name' from $repo" >&2
  fi
done

# 3. Repo-versioned skills (now owned by the `agents` stow package): drop any stale CLI
#    lock entry and installed copy so stow — which setup.sh runs AFTER this script — can
#    own the name. Derived from the repo, so new opencode skills are covered automatically
#    once they have a SKILL.md. (Symlinked stow targets resolve to the opencode source.)
for s in "$LOCAL_SRC"/*/; do
  [ -f "$s/SKILL.md" ] || continue
  name="$(basename "$s")"
  if grep -q "\"$name\":" "$HOME/.agents/.skill-lock.json" 2>/dev/null; then
    npx --yes skills remove "$name" -g -a "$AGENT" -y >/dev/null 2>&1 || true
  fi
  rm -rf "$DEST/$name"
done

# 3b. `skills remove` deletes the installed dir but leaves the lock entry; purge those
#     inert entries so the lock file only tracks CLI-managed (remote) skills and
#     `skills update` can never resurrect a stow-owned name.
if command -v python3 >/dev/null 2>&1; then
  python3 - "$HOME/.agents/.skill-lock.json" "$LOCAL_SRC" <<'PY'
import json, os, sys
lock_path, src = sys.argv[1], sys.argv[2]
try:
    with open(lock_path) as f:
        lock = json.load(f)
except (OSError, ValueError):
    sys.exit(0)
removed = [n for n in os.listdir(src)
           if os.path.isfile(os.path.join(src, n, 'SKILL.md')) and n in lock.get('skills', {})]
for n in removed:
    del lock['skills'][n]
if removed:
    with open(lock_path, 'w') as f:
        json.dump(lock, f, indent=2)
        f.write('\n')
PY
fi

# 4. Refresh everything lock-tracked (anthropics + REMOTE_SKILLS) to latest.
#    Best-effort: fail soft when offline so setup.sh still completes.
if npx --yes skills update --global --yes; then
  echo "Refreshed lock-tracked skills via 'skills update'"
else
  echo "WARNING: 'skills update' failed (offline?); keeping installed versions" >&2
fi

echo "Remote skills refreshed → $DEST (repo skills are stowed via the \`agents\` package)"
