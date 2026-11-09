#!/usr/bin/env bash
# usage-statusline — install
#
# Copies statusline.sh to ~/.claude/usage-statusline.sh and points the
# top-level statusLine in ~/.claude/settings.json at it. A plugin cannot set
# that key itself, and the plugin cache path changes on every update, so the
# script is copied to a stable path. Re-run after a plugin update.
#
# Also sets statusLine.refreshInterval (unless already set) so the cache and
# plan countdowns keep ticking while the session is idle.
#
#   install.sh           install; refuses to replace a different status line
#   install.sh --force   replace an existing status line (settings are backed up)

set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)/statusline.sh"
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
dest="$dir/usage-statusline.sh"
settings="$dir/settings.json"
cmd="~/.claude/usage-statusline.sh"
REFRESH_SECONDS=30
[ -n "${CLAUDE_CONFIG_DIR:-}" ] && cmd="$dest"

command -v jq >/dev/null 2>&1 || { echo "jq is required (brew install jq / apt install jq)" >&2; exit 1; }

mkdir -p "$dir"
[ -f "$settings" ] || echo '{}' > "$settings"
jq empty "$settings" 2>/dev/null || { echo "$settings is not valid JSON; fix it first" >&2; exit 1; }

current=$(jq -r '.statusLine.command // empty' "$settings")
if [ -n "$current" ] && [ "$current" != "$cmd" ] && [ "${1:-}" != "--force" ]; then
  echo "statusLine is already set to: $current" >&2
  echo "Run again with --force to replace it (settings.json is backed up first)." >&2
  exit 2
fi

install -m 755 "$src" "$dest"

tmp=$(mktemp)
jq --arg cmd "$cmd" --argjson every "$REFRESH_SECONDS" '
  .statusLine = {padding: 0, refreshInterval: $every}
    + (if .statusLine.command == $cmd then .statusLine else {} end)
    + {type: "command", command: $cmd}' "$settings" > "$tmp"
if [ "$(jq -S . "$tmp")" != "$(jq -S . "$settings")" ]; then
  cp "$settings" "$settings.bak.$(date +%Y%m%d%H%M%S)"
  mv "$tmp" "$settings"
else
  rm -f "$tmp"
fi

echo "Installed $dest"
echo "statusLine -> $cmd, refreshed every $(jq -r '.statusLine.refreshInterval' "$settings") s (shows on the next refresh; restart Claude Code if it does not)"
