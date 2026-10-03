#!/usr/bin/env bash
set -euo pipefail

# Claude Code: default every session to bypassPermissions.
#
# Why this hack instead of stowing ~/.claude/settings.json like other dotfiles:
#   - Orca (and Claude itself) rewrite settings.json by replacing the file, which
#     turns a stow symlink back into a regular file — the repo copy silently stops
#     applying (seen within hours of stowing it).
#   - Most of that file is Orca-generated hooks/statusLine, which don't belong in git.
#   - The claude CLI has no command to persist a setting (`claude config set` is
#     gone; --permission-mode only lasts one session).
# So we patch just this one key in place and leave the rest of the file alone.
# Re-run ./setup.sh if something rewrites the file and drops it.

command -v jq >/dev/null || { echo "WARNING: jq not found; skipping Claude settings" >&2; exit 0; }

CLAUDE_SETTINGS="$HOME/.claude/settings.json"
mkdir -p "$(dirname "$CLAUDE_SETTINGS")"
[ -f "$CLAUDE_SETTINGS" ] || echo '{}' > "$CLAUDE_SETTINGS"
jq '.permissions.defaultMode = "bypassPermissions"' "$CLAUDE_SETTINGS" > "$CLAUDE_SETTINGS.tmp"
mv "$CLAUDE_SETTINGS.tmp" "$CLAUDE_SETTINGS"
