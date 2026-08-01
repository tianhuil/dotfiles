#!/usr/bin/env bash
set -euo pipefail

# Manage skills in ~/.agents/skills/ (the shared agent-skills dir that pi reads).
#
# pi has no agent alias in the `skills` CLI (it maps pi → ~/.pi/agent/skills/,
# which this build doesn't read). The CLI maps cline/warp/zed/loaf/dexto/kimi-code-cli
# to ~/.agents/skills/, so we install under "cline" and pi picks the skills up.
#
# Two classes of skills:
#   1. Anthropic shared skills (pdf, docx, pptx, xlsx, ...) — installed via the
#      `skills` CLI from anthropics/skills and lock-tracked in ~/.agents/.skill-lock.json.
#      Refresh with: npx skills update
#   2. Custom skills versioned in this repo (home/opencode/.config/opencode/skills/) —
#      symlinked straight from the repo so edits propagate to pi immediately. The CLI
#      copies local-path sources and doesn't lock them, so symlinks are a better fit.
#
# plannotator-* skills are installed by the plannotator CLI itself and are left alone.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT="cline"                  # CLI alias whose global dir is ~/.agents/skills/
DEST="$HOME/.agents/skills"
LOCAL_SRC="$SCRIPT_DIR/home/opencode/.config/opencode/skills"

# Custom skills shared with opencode, versioned in this repo
LOCAL_SKILLS=(agent-browser find-docs find-skills gh-grep installing-age-gated-packages serena vercel-ai-sdk-models)

has_skill() { [ -e "$DEST/$1" ]; }

if ! command -v npx >/dev/null 2>&1; then
  echo "WARNING: npx not found; skipping skills install" >&2
  exit 0
fi

mkdir -p "$DEST"

# Anthropic shared skills. Previously these came from a _shared clone that collided
# with stale top-level copies; now they're installed exactly once via the CLI.
has_skill pdf || npx --yes skills add anthropics/skills --agent "$AGENT" --global --yes --skill '*'

# Custom skills from this repo. Drop any stale CLI lock entry first so 'skills update'
# won't overwrite the repo version, then symlink so the repo stays the source of truth.
for s in "${LOCAL_SKILLS[@]}"; do
  npx --yes skills remove "$s" -g -a "$AGENT" -y >/dev/null 2>&1 || true
  rm -rf "$DEST/$s"
  ln -s "$LOCAL_SRC/$s" "$DEST/$s"
done

echo "Skills installed → $DEST (anthropics via 'npx skills update')"
