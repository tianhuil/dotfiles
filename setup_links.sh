#!/usr/bin/env bash
set -euo pipefail

# Expose the shared ~/.agents tree to every agent harness via per-entry symlinks.
# setup.sh runs this AFTER stow, so ~/.agents/{skills,commands} already exist.
#
#   ~/.agents/skills/<name>/   — pi and opencode read natively; Claude Code does not
#   ~/.agents/commands/*.md    — no tool reads this; linked into each tool's command dir
#   ~/.pi/agent/AGENTS.md      — global instructions; Claude reads ~/.claude/CLAUDE.md
#
# Entries the tool already owns (real files/dirs, e.g. Claude's synced/ or
# plannotator-*) are never overwritten. Links whose source disappeared are pruned.

SRC="$HOME/.agents"

# link_each <src-dir> <dst-dir> <filter>: symlink each matching entry of src into dst.
link_each() {
  local src=$1 dst=$2 filter=$3 p d
  [ -d "$src" ] || return 0
  mkdir -p "$dst"
  for p in "$src"/*; do
    "$filter" "$p" || continue
    d="$dst/$(basename "$p")"
    if [ -e "$d" ] && [ ! -L "$d" ]; then
      echo "WARNING: $d exists and is not a symlink; skipping" >&2
      continue
    fi
    ln -sfn "$p" "$d"
  done
  # Prune dangling links that point into src (leave links other tools own alone).
  for d in "$dst"/*; do
    [ -L "$d" ] && [ ! -e "$d" ] && [[ "$(readlink "$d")" == "$src"/* ]] && rm -f "$d"
  done
  return 0
}

is_skill() { [ -f "$1/SKILL.md" ]; }
is_md()    { [ -f "$1" ] && [[ "$1" == *.md ]]; }

link_each "$SRC/skills"   "$HOME/.claude/skills"            is_skill
link_each "$SRC/commands" "$HOME/.claude/commands"          is_md
link_each "$SRC/commands" "$HOME/.pi/agent/prompts"         is_md
link_each "$SRC/commands" "$HOME/.config/opencode/commands" is_md

# Global instructions: Claude reads CLAUDE.md; pi's AGENTS.md is the shared source.
if [ ! -e "$HOME/.claude/CLAUDE.md" ] || [ -L "$HOME/.claude/CLAUDE.md" ]; then
  ln -sfn "$HOME/.pi/agent/AGENTS.md" "$HOME/.claude/CLAUDE.md"
fi

echo "Linked ~/.agents skills/commands → Claude, pi, opencode"
