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

# Deliberately not pgrep: on macOS `pgrep -x claude` matches only some of the
# running sessions, because the kernel accounting name can carry the CLI version
# rather than "claude". Matching ps output on comm finds all of them.
pids=$(ps ax -o pid=,comm= 2>/dev/null | awk '{
  n = $2
  sub(/.*\//, "", n)
  if (n == "claude") print $1
}')

if [ -z "$pids" ]; then
  echo "No running Claude Code sessions found."
  exit 0
fi

# Sample per-process network deltas once, then look each PID up in the result.
nettop_out=""
if command -v nettop >/dev/null 2>&1; then
  nettop_out=$(nettop -P -d -s "$sample" -l 2 -n -J bytes_out 2>/dev/null | tail -n +2)
else
  echo "note: nettop unavailable — upload rates omitted (macOS only)." >&2
  sleep "$sample"
fi

printf '%-8s %-14s %-10s %-12s %s\n' PID UPTIME UPLOAD/S TRANSCRIPT DIRECTORY
printf '%s\n' "--------------------------------------------------------------------------------"

for pid in $pids; do
  uptime=$(ps -p "$pid" -o etime= 2>/dev/null | tr -d ' ')
  [ -n "$uptime" ] || continue

  cwd=$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | grep '^n' | sed 's/^n//' | head -1)
  [ -n "$cwd" ] || cwd="?"

  # nettop truncates the command name, so match on the .PID suffix.
  #
  # `nettop -d -l 2` emits two blocks: the first is cumulative since the process
  # started, the second is the delta over the sample window. Only the second is a
  # rate. Keep overwriting and print at END so the last block wins — taking the
  # first match reports the lifetime total as if it were per-sample traffic,
  # which overstates a long-lived session by orders of magnitude.
  #
  # The scan starts at field 2: the truncated name in field 1 is a version string
  # like "2.1.225.41258", which is all digits and dots and would otherwise parse
  # as a byte count.
  bytes=$(printf '%s\n' "$nettop_out" | awk -v p=".$pid" '
    index($1, p) && length($1) - length(p) == index($1, p) - 1 {
      v = 0; u = ""
      for (i = NF; i >= 2; i--) {
        if ($i ~ /^[0-9.]+$/) { v = $i; u = $(i + 1); break }
      }
      if      (u == "KiB") v *= 1024
      else if (u == "MiB") v *= 1048576
      else if (u == "GiB") v *= 1073741824
      last = v
    }
    END { printf "%d", last + 0 }')
  case "$bytes" in ''|*[!0-9]*) bytes=0 ;; esac
  rate=$((bytes / sample))

  # Newest transcript for this working directory. Claude Code slugifies the path
  # by replacing both slashes and underscores with hyphens, so "a/my_app"
  # becomes "-a-my-app"; converting only slashes silently misses those projects.
  slug=$(printf '%s' "$cwd" | sed 's|[/_]|-|g')
  tdir="$HOME/.claude/projects/$slug"
  tsize=0
  if [ -d "$tdir" ]; then
    newest=$(ls -t "$tdir"/*.jsonl 2>/dev/null | head -1)
    [ -n "$newest" ] && tsize=$(file_size "$newest")
  fi

  printf '%-8s %-14s %-10s %-12s %s\n' \
    "$pid" "$uptime" "$(human $rate)" "$(human "$tsize")" "$cwd"
done

echo
echo "Upload/s is a ${sample}s sample and is bursty: a session that looks idle"
echo "may still spike during a turn. Transcript size is the durable signal —"
echo "it is re-uploaded in full on every turn."
