#!/usr/bin/env bash
# usage-statusline — status line
#
# Reads the status line JSON on stdin and prints one line:
#   Opus 5.5 │ ctx ████░░░░░░ 42% 84k/200k │ 5h 31% ↻2h13m │ 7d 12% ↻3d4h
#
# Model, context fill as a bar (green < 50 %, yellow < 80 %, red above) and,
# on Pro/Max plans, the 5-hour and 7-day usage with time until each resets.
# The plan figures appear only after the session's first response.

input=$(cat)

command -v jq >/dev/null 2>&1 || { printf 'usage-statusline: jq not installed\n'; exit 0; }

RESET=$'\033[0m'; DIM=$'\033[2m'
GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'

color() { # percentage -> color
  local p=${1%.*}
  if [ "${p:-0}" -ge 80 ]; then printf %s "$RED"
  elif [ "${p:-0}" -ge 50 ]; then printf %s "$YELLOW"
  else printf %s "$GREEN"; fi
}

until_reset() { # epoch seconds -> "2h13m" / "3d4h"
  local s=$(( $1 - $(date +%s) ))
  [ "$s" -le 0 ] && return
  local d=$(( s / 86400 )) h=$(( s % 86400 / 3600 )) m=$(( s % 3600 / 60 ))
  if [ "$d" -gt 0 ]; then printf '%dd%dh' "$d" "$h"
  elif [ "$h" -gt 0 ]; then printf '%dh%02dm' "$h" "$m"
  else printf '%dm' "$m"; fi
}

read -r model ctx_pct ctx_size ctx_used five five_reset week week_reset < <(
  echo "$input" | jq -r '[
    (.model.display_name // "?" | gsub(" "; "_")),
    (.context_window.used_percentage // 0),
    (.context_window.context_window_size // 200000),
    ((.context_window.current_usage // {}) | (.input_tokens // 0) + (.cache_creation_input_tokens // 0) + (.cache_read_input_tokens // 0)),
    (.rate_limits.five_hour.used_percentage // "-"),
    (.rate_limits.five_hour.resets_at // 0),
    (.rate_limits.seven_day.used_percentage // "-"),
    (.rate_limits.seven_day.resets_at // 0)
  ] | map(tostring) | join(" ")'
)

# Context bar
pct=${ctx_pct%.*}
filled=$(( pct / 10 )); [ "$filled" -gt 10 ] && filled=10
bar=$(printf '%*s' "$filled" '' | tr ' ' '█')$(printf '%*s' $(( 10 - filled )) '' | tr ' ' '░')
out="${model//_/ } ${DIM}│${RESET} ctx $(color "$pct")${bar} ${pct}%${RESET} ${DIM}$(( ctx_used / 1000 ))k/$(( ctx_size / 1000 ))k${RESET}"

# Plan usage (only for Pro/Max, after the first response)
if [ "$five" != "-" ]; then
  out+=" ${DIM}│${RESET} 5h $(color "$five")${five%.*}%${RESET}"
  r=$(until_reset "${five_reset%.*}"); [ -n "$r" ] && out+=" ${DIM}↻${r}${RESET}"
fi
if [ "$week" != "-" ]; then
  out+=" ${DIM}│${RESET} 7d $(color "$week")${week%.*}%${RESET}"
  r=$(until_reset "${week_reset%.*}"); [ -n "$r" ] && out+=" ${DIM}↻${r}${RESET}"
fi

printf '%s\n' "$out"
