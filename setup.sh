#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

command -v stow >/dev/null || { echo "Install stow first: brew install stow"; exit 1; }

# Prepare ~/.agents/skills BEFORE stow: install remote skills via the `skills` CLI
# and clear CLI ownership of repo-stowed skills, so the `agents` stow package can
# own them without clashing with CLI-installed copies (docx/pdf/pptx/... from anthropics).
"$SCRIPT_DIR/setup_skills.sh"

# Stow every package present in this checkout — .stowrc sets --target=$HOME
# and --no-folding. We filter to existing dirs because some packages are
# local-only: e.g. `env` holds a gitignored secret (.env.local) and is absent
# in a fresh clone on any platform — stowing it would abort otherwise.
cd "$SCRIPT_DIR/home"
ALL_PKGS=(shell git ssh node bun tmux stubby bin scripts cursor zellij worktrunk opencode env omp pi agents)
PKGS=()
for pkg in "${ALL_PKGS[@]}"; do
  [ -d "$pkg" ] && PKGS+=("$pkg")
done
stow --restow "${PKGS[@]}"

# npm writes auth tokens to its user config on `npm login`; keep them out of the
# stowed (tracked) .npmrc. NPM_CONFIG_USERCONFIG in .coreenv redirects npm's user
# config to the gitignored ~/.npmrc.secrets; this strip is defense-in-depth for
# shells that didn't source .coreenv.
NODE_NPMRC="$SCRIPT_DIR/home/node/.npmrc"
if grep -qs '_authToken' "$NODE_NPMRC"; then
  awk '!/_authToken/' "$NODE_NPMRC" > "$NODE_NPMRC.tmp"
  mv "$NODE_NPMRC.tmp" "$NODE_NPMRC"
  echo "WARNING: stripped leaked _authToken from home/node/.npmrc (use ~/.npmrc.secrets)" >&2
fi
touch "$HOME/.npmrc.secrets"

# Steps stow can't express
# git expands ~ itself, so keep the value neutral across machines
# (an absolute path here would leak this box's HOME into the repo file)
git config --global core.excludesfile '~/.gitignore_global'

# Init submodules
cd "$SCRIPT_DIR"
git submodule update --init --recursive

# Build local open-queue plugin
if [ -d ~/.config/opencode/plugins/open-queue ] && command -v bun >/dev/null 2>&1; then
  (cd ~/.config/opencode/plugins/open-queue && bun install && bun run build)
fi

# Install pi extension dependencies.
if [ -d ~/.pi/agent/extensions/models-filter ] && command -v bun >/dev/null 2>&1; then
  (cd ~/.pi/agent/extensions/models-filter && bun install)
fi
if [ -f ~/.pi/agent/extensions/subagent/package-lock.json ] && command -v npm >/dev/null 2>&1; then
  (cd ~/.pi/agent/extensions/subagent && npm ci --omit=dev)
fi

# RTK opencode integration
command -v rtk >/dev/null 2>&1 && rtk init -g --opencode

# Generate cached shell init/completion files (avoids subprocess on every shell start)
# Usage: cache_output <command> <args...> <output-file>
cache_output() {
  local file="${@: -1}"
  local cmd="${@:1:$#-1}"
  if command -v "${cmd%% *}" &>/dev/null && [ ! -f "$file" ]; then
    mkdir -p "$(dirname "$file")"
    $cmd > "$file"
    echo "Generated $file"
  fi
}

cache_output ngrok completion zsh "$HOME/.config/ngrok/completion.zsh"
cache_output zoxide init zsh "$HOME/.config/zoxide/init.zsh"
cache_output wtp completion zsh "$HOME/.config/wtp/completion.zsh"
cache_output wt config shell init zsh "$HOME/.config/wt/init.zsh"

# fzf: one-time install generates ~/.fzf.zsh (key bindings + completions)
if command -v fzf &>/dev/null && [ ! -f "$HOME/.fzf.zsh" ]; then
  $(brew --prefix)/opt/fzf/install --no-bash --no-fish --completion --key-bindings --no-update-rc >/dev/null 2>&1
  echo "Generated ~/.fzf.zsh"
fi

echo "Stowed ${#PKGS[@]} packages → $HOME"
