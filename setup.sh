#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

command -v stow >/dev/null || { echo "Install stow first: brew install stow"; exit 1; }

# Stow all packages — .stowrc sets --target="$HOME" and --no-folding
cd "$SCRIPT_DIR/home"
PKGS=(shell git ssh node bun tmux stubby bin scripts cursor zellij worktrunk opencode env omp)
stow --restow "${PKGS[@]}"
# Steps stow can't express
git config --global core.excludesfile ~/.gitignore_global

# Init submodules (includes compound-engineering-src for CE skills)
cd "$SCRIPT_DIR"
git submodule update --init --recursive

# Symlink CE skills into ~/.omp/agent/skills/ for native discovery
CE_SKILLS_SRC="$SCRIPT_DIR/compound-engineering-src/skills"
CE_SKILLS_DST="$HOME/.omp/agent/skills"
if [ -d "$CE_SKILLS_SRC" ]; then
  ln -snf "$CE_SKILLS_SRC" "$CE_SKILLS_DST"
  echo "Linked CE skills → $CE_SKILLS_DST"
else
  echo "WARNING: CE skills not found at $CE_SKILLS_SRC" >&2
fi

# Build local open-queue plugin
if [ -d ~/.config/opencode/plugins/open-queue ] && command -v bun >/dev/null 2>&1; then
  (cd ~/.config/opencode/plugins/open-queue && bun install && bun run build)
fi

# RTK opencode integration
command -v rtk >/dev/null 2>&1 && rtk init -g --opencode

echo "Stowed ${#PKGS[@]} packages → $HOME"
