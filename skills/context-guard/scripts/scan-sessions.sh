#!/usr/bin/env bash
# context-guard — scan every running Claude Code session on this machine and
# report how much each one is uploading right now.
#
# Usage: scan-sessions.sh [sample_seconds]   (default 5)

set -uo pipefail

# awk honours the locale's decimal separator; force C so sizes read as expected.
export LC_ALL=C LC_NUMERIC=C

sample=${1:-5}
case "$sample" in ''|*[!0-9]*) sample=5 ;; esac
[ "$sample" -gt 0 ] || sample=5

human() {
  awk -v b="$1" 'BEGIN{
    if (b >= 1073741824) printf "%.1f GB", b/1073741824;
    else if (b >= 1048576) printf "%.1f MB", b/1048576;
    else if (b >= 1024)    printf "%.0f KB", b/1024;
    else                   printf "%d B", b;
  }'
}

file_size() {
  [ -f "$1" ] || { printf '0'; return; }
  stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || printf '0'
}

# Deliberately not pgrep -x: it misses sessions whose kernel accounting name
# carries the CLI version instead of "claude". Match the full command line so
# npm installs (node .../@anthropic-ai/claude-code/cli.js) and absolute-path
# launches are found too; skip this script's own process tree.
pids=$(ps ax -o pid=,command= 2>/dev/null | awk '
  /scan-sessions/ { next }
  {
    cmd = $0; sub(/^ *[0-9]+ +/, "", cmd)
    n = cmd; sub(/ .*/, "", n); sub(/.*\//, "", n)
    if (n == "claude" || cmd ~ /@anthropic-ai\/claude-code\/cli\.js/) print $1
  }')

if [ -z "$pids" ]; then
  echo "No running Claude Code sessions found."
  exit 0
fi

# Sample per-process network deltas once, then look each PID up in the result.
# -x makes nettop emit raw integer bytes, so no KiB/MiB unit parsing is needed.
have_rates=0
nettop_out=""
if command -v nettop >/dev/null 2>&1; then
  have_rates=1
  nettop_out=$(nettop -P -d -s "$sample" -l 2 -x -J bytes_out 2>/dev/null | tail -n +2)
fi

printf '%-8s %-14s %-10s %-12s %-38s %s\n' PID UPTIME UPLOAD/S NEWEST-LOG SESSION DIRECTORY
printf '%s\n' "----------------------------------------------------------------------------------------------------"

for pid in $pids; do
  uptime=$(ps -p "$pid" -o etime= 2>/dev/null | tr -d ' ')
  [ -n "$uptime" ] || continue

  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | sed 's/^n//' | head -1)
  [ -n "$cwd" ] || cwd="?"

  if [ "$have_rates" = 1 ]; then
    # nettop truncates the command name, so match on the .PID suffix.
    #
    # `nettop -d -l 2` emits two blocks: the first is cumulative since the
    # process started, the second is the delta over the sample window. Only the
    # second is a rate — keep overwriting and print at END so the last block
    # wins; taking the first match would report the lifetime total as if it
    # were per-sample traffic.
    bytes=$(printf '%s\n' "$nettop_out" | awk -v p=".$pid" '
      index($1, p) && length($1) - length(p) == index($1, p) - 1 { last = $NF }
      END { printf "%d", last + 0 }')
    case "$bytes" in ''|*[!0-9]*) bytes=0 ;; esac
    rate=$(human $((bytes / sample)))
  else
    # No nettop (Linux): say so explicitly — a literal 0 B would read as a
    # measured idle rate and send the diagnosis the wrong way.
    rate="n/a"
  fi

  # Newest transcript in this working directory's project dir. Claude Code
  # slugifies the cwd by replacing every non-alphanumeric character with a
  # hyphen (verified against the CLI), so "/a/my_app.v2" becomes
  # "-a-my-app-v2". Very long paths are additionally truncated with a hash
  # suffix — those won't resolve here and show "-".
  slug=$(printf '%s' "$cwd" | sed 's|[^a-zA-Z0-9]|-|g')
  tdir="$HOME/.claude/projects/$slug"
  tsize=0
  session="-"
  if [ -d "$tdir" ]; then
    newest=$(ls -t "$tdir"/*.jsonl 2>/dev/null | head -1)
    if [ -n "$newest" ]; then
      tsize=$(file_size "$newest")
      session=$(basename "$newest" .jsonl)
    fi
  fi

  printf '%-8s %-14s %-10s %-12s %-38s %s\n' \
    "$pid" "$uptime" "$rate" "$(human "$tsize")" "$session" "$cwd"
done

echo
[ "$have_rates" = 0 ] && echo "note: nettop unavailable (macOS only) — UPLOAD/S shown as n/a."
echo "Upload/s is a ${sample}s sample and is bursty: a session that looks idle"
echo "may still spike during a turn."
echo "NEWEST-LOG / SESSION describe the most recently written transcript in that"
echo "directory's project folder. Sessions sharing a directory share this column,"
echo "and the on-disk log is append-only — it keeps growing after /compact — so"
echo "it is an upper bound on live context, not a per-turn upload figure."
echo "Resume an ended session with: claude --resume <SESSION>"
