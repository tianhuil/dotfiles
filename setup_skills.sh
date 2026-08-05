#!/usr/bin/env bash
set -euo pipefail

# Manage skills in ~/.agents/skills/ (the shared agent-skills dir that pi reads).
#
# pi has no agent alias in the `skills` CLI (it maps pi → ~/.pi/agent/skills/,
# which this build doesn't read). The CLI maps cline/warp/zed/loaf/dexto/kimi-code-cli
# to ~/.agents/skills/, so we install under "cline" and pi picks the skills up.
#
# Model: declarative names, not vendored content. setup.sh re-runs this script on
# every machine, so:
#   - missing skills are installed from their source repo (lists below), and
#   - installed skills are refreshed to latest via `skills update` — the lock file
#     ~/.agents/.skill-lock.json maps skill name → source repo + content hash, so
#     re-running setup.sh pulls updates without storing any skill content in this repo.
#
# Two classes of skills:
#   1. Remote skills from other repos (anthropics/skills, lavish-axi) — declared in
#      REMOTE_SKILLS, installed via the `skills` CLI, lock-tracked, refreshed every run.
#   2. Custom skills versioned in this repo (home/opencode/.config/opencode/skills/) —
#      symlinked straight from the repo so edits propagate to pi immediately. The CLI
#      copies local-path sources and doesn't lock them, so symlinks are a better fit.
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
  # "kunchenguid/lavish-axi:lavish"
  "kunchenguid/axi:axi"
  "mattpocock/skills:*"
  "stablyai/orca:orca-cli"
)

# Custom skills shared with opencode, versioned in this repo
LOCAL_SKILLS=(agent-browser find-docs find-skills gh-grep installing-age-gated-packages serena vercel-ai-sdk-models)

has_skill() { [ -e "$DEST/$1" ]; }

if ! command -v npx >/dev/null 2>&1; then
  echo "WARNING: npx not found; skipping skills install" >&2
  exit 0
fi

mkdir -p "$DEST"

# Remote skills — install any that are missing (content comes from the CLI,
# lock-tracked for refresh below). Wildcard entries gate on a representative skill
# (gate_skill_for) so the whole-repo install isn't re-run every setup.
for entry in "${REMOTE_SKILLS[@]}"; do
  repo="${entry%%:*}"
  name="${entry##*:}"
  if [ "$name" = "*" ]; then
    gate="$(gate_skill_for "$repo")"
    if [ -z "$gate" ] || ! has_skill "$gate"; then
      npx --yes skills add "$repo" --agent "$AGENT" --global --yes --skill '*' \
        || echo "WARNING: failed to install skills from $repo" >&2
    fi
  elif ! has_skill "$name"; then
    npx --yes skills add "$repo" --agent "$AGENT" --global --yes --skill "$name" \
      || echo "WARNING: failed to install skill '$name' from $repo" >&2
  fi
done

# 3. Custom skills from this repo. Drop any stale CLI lock entry first so 'skills update'
#    won't overwrite the repo version, then symlink so the repo stays the source of truth.
#    (Symlinks are rebuilt every run, so they self-correct if the repo moves machines.)
for s in "${LOCAL_SKILLS[@]}"; do
  npx --yes skills remove "$s" -g -a "$AGENT" -y >/dev/null 2>&1 || true
  rm -rf "$DEST/$s"
  ln -s "$LOCAL_SRC/$s" "$DEST/$s"
done

# 4. Refresh everything lock-tracked (anthropics + REMOTE_SKILLS) to latest.
#    Best-effort: fail soft when offline so setup.sh still completes.
if npx --yes skills update --global --yes; then
  echo "Refreshed lock-tracked skills via 'skills update'"
else
  echo "WARNING: 'skills update' failed (offline?); keeping installed versions" >&2
fi

echo "Skills installed → $DEST (refresh every run via 'skills update')"
