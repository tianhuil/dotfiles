#!/bin/bash
# Prune package manager caches, keeping only the latest version per package.
USAGE='Usage: prune-caches.sh [bun|pnpm|uv|cargo|npm|yarn|all]'

report() {
  local label="$1" before="$2" after="$3"
  local saved=$(( before - after ))
  if [ "$saved" -gt 0 ] 2>/dev/null; then
    echo "  $label: $(numfmt --to=iec "$before") -> $(numfmt --to=iec "$after") (saved $(numfmt --to=iec "$saved"))"
  fi
}

prune_bun() {
  local cache="${BUN_INSTALL:-$HOME/.bun}/install/cache"
  [ -d "$cache" ] || return
  local before after
  before=$(du -sk "$cache" 2>/dev/null | cut -f1)
  (cd "$cache" && for d in *@*; do
    [ -d "$d" ] || continue
    name="${d%%@*}"
    ver="${d#$name@}"; ver="${ver%%@@@1}"; ver="${ver%%/}"
    echo "$name|$ver|$d"
  done | sort -t'|' -k1,1 -k2,2V | awk -F'|' '
    $1 != prev { prev=$1; last=$3; next }
    { print last; last=$3 }
  ' | xargs -r rm -rf)
  after=$(du -sk "$cache" 2>/dev/null | cut -f1)
  report bun "$before" "$after"
}

prune_pnpm() {
  command -v pnpm &>/dev/null || return
  local store before after
  store=$(pnpm store path 2>/dev/null) || return
  before=$(du -sk "$store" 2>/dev/null | cut -f1) || return
  pnpm store prune &>/dev/null
  after=$(du -sk "$store" 2>/dev/null | cut -f1)
  report pnpm "$before" "$after"
}

prune_uv() {
  local cache="${XDG_CACHE_HOME:-$HOME/.cache}/uv"
  [ -d "$cache" ] || cache="$HOME/Library/Caches/uv"
  [ -d "$cache" ] || return
  local before after
  before=$(du -sk "$cache" 2>/dev/null | cut -f1) || return
  # fast deletion: delete files then empty dirs; keep index (simple-v*)
  find "$cache" -maxdepth 1 -type d ! -name 'simple-v*' ! -name 'CACHEDIR.TAG' -exec sh -c '
    find "$1" -type f -delete
    find "$1" -depth -type d -delete
  ' _ {} \; 2>/dev/null
  after=$(du -sk "$cache" 2>/dev/null | cut -f1)
  report uv "$before" "$after"
}

prune_cargo() {
  local cache="${CARGO_HOME:-$HOME/.cargo}/registry/cache"
  [ -d "$cache" ] || return
  local before after
  before=$(du -sk "$cache" 2>/dev/null | cut -f1)
  find "$cache" -name '*.crate' -type f | sed 's/\.crate$//' | while IFS= read -r f; do
    base="${f%-*}"; ver="${f##*-}"
    echo "$base|$ver|$f.crate"
  done | sort -t'|' -k1,1 -k2,2V | awk -F'|' '
    $1 != prev { prev=$1; last=$3; next }
    { print last; last=$3 }
  ' | xargs -r rm -f
  after=$(du -sk "$cache" 2>/dev/null | cut -f1)
  report cargo "$before" "$after"
}

prune_npm() {
  local cache="$HOME/.npm/_cacache"
  [ -d "$cache" ] || return
  local before after
  before=$(du -sk "$cache" 2>/dev/null | cut -f1)
  npm cache clean --force &>/dev/null
  after=$(du -sk "$cache" 2>/dev/null | cut -f1)
  report npm "$before" "$after"
}

prune_yarn() {
  local cache
  cache=$(yarn cache dir 2>/dev/null) || return
  [ -d "$cache" ] || return
  local before after
  before=$(du -sk "$cache" 2>/dev/null | cut -f1)
  yarn cache clean &>/dev/null
  after=$(du -sk "$cache" 2>/dev/null | cut -f1)
  report yarn "$before" "$after"
}

main() {
  local tools=()
  if [ $# -eq 0 ]; then
    tools=(bun pnpm uv cargo npm yarn)
  else
    tools=("$@")
  fi
  echo "Pruning caches..."
  for t in "${tools[@]}"; do
    "prune_$t" 2>/dev/null || echo "  $t: not available"
  done
}

main "$@"
