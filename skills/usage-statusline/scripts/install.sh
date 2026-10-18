#!/usr/bin/env bash
# usage-statusline — install
#
# Copies statusline.sh to ~/.claude/usage-statusline.sh and points the
# top-level statusLine in ~/.claude/settings.json at it. A plugin cannot set
# that key itself, and the plugin cache path changes on every update, so the
# script is copied to a stable path. Re-run after a plugin update.
#
#   install.sh           install; refuses to replace a different status line
#   install.sh --force   replace an existing status line (settings are backed up)

set -euo pipefail

src="$(cd "$(dirname "$0")" && pwd)/statusline.sh"
dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
dest="$dir/usage-statusline.sh"
settings="$dir/settings.json"
cmd="~/.claude/usage-statusline.sh"
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

if [ "$current" != "$cmd" ]; then
  cp "$settings" "$settings.bak.$(date +%Y%m%d%H%M%S)"
  tmp=$(mktemp)
  jq --arg cmd "$cmd" '.statusLine = {type: "command", command: $cmd, padding: 0}' "$settings" > "$tmp"
  mv "$tmp" "$settings"
fi

echo "Installed $dest"
echo "statusLine -> $cmd (shows on the next refresh; restart Claude Code if it does not)"
