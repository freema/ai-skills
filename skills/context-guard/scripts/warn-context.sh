#!/usr/bin/env bash
# context-guard — UserPromptSubmit hook
#
# Warns once each time the *live* part of the session transcript crosses
# another threshold step, so a long-running session can't quietly grow into a
# multi-hundred-KB upload on every single turn.
#
# The transcript .jsonl is an append-only log: /compact writes a summary record
# and keeps appending, so total file size overstates live context after any
# compaction. What tracks per-turn upload is the content accumulated since the
# last compact marker — that is what this hook measures and warns on.
#
# Overridable:
#   CONTEXT_GUARD_WARN_MB   step size in MB (default 5)
#
# Always exits 0: a monitoring hook must never block a prompt.

set -uo pipefail

# awk honours the locale's decimal separator; force C so sizes read as expected.
export LC_ALL=C LC_NUMERIC=C

input=$(cat)
command -v jq >/dev/null 2>&1 || exit 0

step_mb=${CONTEXT_GUARD_WARN_MB:-5}
case "$step_mb" in ''|*[!0-9]*) step_mb=5 ;; esac
[ "$step_mb" -gt 0 ] || step_mb=5

transcript=$(printf '%s' "$input" | jq -r '.transcript_path // ""' 2>/dev/null)
session=$(printf '%s' "$input" | jq -r '.session_id // "unknown"' 2>/dev/null)
[ -n "$transcript" ] && [ -f "$transcript" ] || exit 0

# Bytes appended after the last compact marker; the whole file if none exists.
size=$(awk '
  { off += length($0) + 1; if (index($0, "isCompactSummary")) last = off }
  END { printf "%d", off - last }
' "$transcript" 2>/dev/null)
case "$size" in ''|*[!0-9]*) exit 0 ;; esac

step_bytes=$((step_mb * 1024 * 1024))
current_step=$((size / step_bytes))

state_dir="${TMPDIR:-/tmp}/context-guard"
mkdir -p "$state_dir" 2>/dev/null || exit 0
state_file="$state_dir/${session}.step"

last_step=0
[ -f "$state_file" ] && last_step=$(cat "$state_file" 2>/dev/null || printf '0')
case "$last_step" in ''|*[!0-9]*) last_step=0 ;; esac

# After /compact the measured size shrinks — lower the stored step so the next
# regrowth warns again instead of being masked by the pre-compact high-water mark.
if [ "$current_step" -lt "$last_step" ]; then
  printf '%s' "$current_step" > "$state_file" 2>/dev/null
  exit 0
fi

# Only speak up when a new step is crossed.
[ "$current_step" -ge 1 ] || exit 0
[ "$current_step" -gt "$last_step" ] || exit 0
printf '%s' "$current_step" > "$state_file" 2>/dev/null

size_mb=$(awk -v s="$size" 'BEGIN{printf "%.0f", s/1048576}')

msg="context-guard: ~${size_mb} MB of conversation has accumulated since this session's last compaction. Claude Code re-sends the whole live context on every turn, so each message is pushing roughly that much upstream — enough to saturate a slow uplink and add latency for everything else on the network. Run /compact to collapse it, or start a fresh session."

jq -n --arg m "$msg" '{systemMessage: $m}'
exit 0
