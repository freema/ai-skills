#!/usr/bin/env bash
# context-guard — status line
#
# Reads the status line JSON on stdin and prints one line showing how big the
# context has grown and roughly how many bytes each turn pushes upstream.
#
# Why this matters: prompt caching saves server-side compute, not upload. The
# client re-serialises the whole message array on every turn, so bytes-on-wire
# scale with total context size, not with the length of what you just typed.
#
# Overridable:
#   CONTEXT_GUARD_WARN_KB   flag per-turn upload at or above this (default 500)
#   CONTEXT_GUARD_BYTES_PER_TOKEN   estimate multiplier (default 4)
#   CONTEXT_GUARD_NO_COLOR  set to 1 to disable ANSI colour

set -uo pipefail

# Force C numeric formatting: under a locale such as cs_CZ, awk renders decimals
# with a comma, which turns "$4.21" into "$4,21" and "1.5G" into "1,5G".
export LC_ALL=C LC_NUMERIC=C

input=$(cat)

command -v jq >/dev/null 2>&1 || { printf 'context-guard: jq not installed'; exit 0; }

warn_kb=${CONTEXT_GUARD_WARN_KB:-500}
bpt=${CONTEXT_GUARD_BYTES_PER_TOKEN:-4}

field() { printf '%s' "$input" | jq -r "$1" 2>/dev/null; }

model=$(field '.model.display_name // "?"')
cwd=$(field '.workspace.current_dir // .cwd // ""')
pct=$(field '.context_window.used_percentage // empty')
tokens=$(field '.context_window.total_input_tokens // 0')
cost=$(field '.cost.total_cost_usd // 0')
transcript=$(field '.transcript_path // ""')

dir=${cwd##*/}
[ -n "$dir" ] || dir="?"

# Integer maths only — bc and python may not be present.
pct_i=$(printf '%s' "${pct:-}" | awk '{printf "%d", $1+0}')
tokens=$(printf '%s' "$tokens" | awk '{printf "%d", $1+0}')
est_bytes=$((tokens * bpt))
est_kb=$((est_bytes / 1024))

human() { # bytes -> compact human string
  awk -v b="$1" 'BEGIN{
    if (b >= 1073741824) printf "%.1fG", b/1073741824;
    else if (b >= 1048576) printf "%.0fM", b/1048576;
    else if (b >= 1024)    printf "%.0fK", b/1024;
    else                   printf "%dB", b;
  }'
}

file_size() { # portable stat
  [ -f "$1" ] || { printf '0'; return; }
  stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || printf '0'
}

if [ "${CONTEXT_GUARD_NO_COLOR:-0}" = "1" ] || [ -n "${NO_COLOR:-}" ]; then
  c_reset='' c_dim='' c_grn='' c_ylw='' c_red='' c_cyn=''
else
  c_reset=$'\033[0m'; c_dim=$'\033[2m'; c_grn=$'\033[32m'
  c_ylw=$'\033[33m'; c_red=$'\033[31m'; c_cyn=$'\033[36m'
fi

# Context percentage, colour-coded.
if [ -n "${pct:-}" ]; then
  if   [ "$pct_i" -ge 80 ]; then ctx_c=$c_red
  elif [ "$pct_i" -ge 50 ]; then ctx_c=$c_ylw
  else                           ctx_c=$c_grn
  fi
  tok_h=$(human $((tokens)))
  ctx_part="${ctx_c}ctx ${pct_i}%${c_reset} ${c_dim}(${tok_h} tok)${c_reset}"
else
  ctx_part="${c_dim}ctx --${c_reset}"
fi

# Estimated upload per turn — the number that actually explains the bandwidth.
if [ "$est_kb" -ge "$warn_kb" ]; then
  up_part="${c_red}↑~$(human $est_bytes)/turn ⚠${c_reset}"
else
  up_part="${c_dim}↑~$(human $est_bytes)/turn${c_reset}"
fi

parts="${c_cyn}${model}${c_reset} ${c_dim}·${c_reset} ${dir} ${c_dim}·${c_reset} ${ctx_part} ${c_dim}·${c_reset} ${up_part}"

if [ -n "$transcript" ]; then
  ts=$(file_size "$transcript")
  [ "$ts" -gt 0 ] 2>/dev/null && parts="${parts} ${c_dim}·${c_reset} ${c_dim}log $(human "$ts")${c_reset}"
fi

cost_s=$(awk -v c="$cost" 'BEGIN{printf "%.2f", c+0}')
parts="${parts} ${c_dim}·${c_reset} ${c_dim}\$${cost_s}${c_reset}"

printf '%s' "$parts"
