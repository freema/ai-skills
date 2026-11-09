#!/usr/bin/env bash
# usage-statusline — status line
#
# Reads the status line JSON on stdin and prints one line:
#   Opus 5.5 │ ████░░░░░░ 42% ⧗ 12 min │ 5h 73%↑ 1:48 │ www/reglog3 │ 🌿 rule-fixes
#
#   - model
#   - context fill as a bar: green < 50 %, yellow < 80 %, red above
#   - minutes until the prompt cache goes cold, only when a lot is cached
#   - Pro/Max plans: the window (5 h or 7 d) closest to its limit, ↑ when usage
#     runs ahead of the clock, time until it resets
#   - project folder (clickable) and git worktree (only in a linked one)
#
# Cache and plan figures appear after the session's first response. The
# countdowns tick while the session is idle only with statusLine.refreshInterval.

input=$(cat)

command -v jq >/dev/null 2>&1 || { printf 'usage-statusline: jq not installed\n'; exit 0; }

CACHE_MIN_TOKENS=50000 # below this a cold cache costs little, so no countdown

RESET=$'\033[0m'; DIM=$'\033[2m'
GREEN=$'\033[32m'; YELLOW=$'\033[33m'; RED=$'\033[31m'
SEP=" ${DIM}│${RESET} "
now=$(date +%s)

color() { # percentage -> color
  if [ "$1" -ge 80 ]; then printf %s "$RED"
  elif [ "$1" -ge 50 ]; then printf %s "$YELLOW"
  else printf %s "$GREEN"; fi
}

until_reset() { # epoch seconds -> "1:48" / "3d4h"
  local s=$(( $1 - now ))
  [ "$s" -le 0 ] && return
  local d=$(( s / 86400 )) h=$(( s % 86400 / 3600 )) m=$(( s % 3600 / 60 ))
  if [ "$d" -gt 0 ]; then printf '%dd%dh' "$d" "$h"
  else printf '%d:%02d' "$h" "$m"; fi
}

link() { # path, label -> label that opens the path when clicked (OSC 8)
  printf '\033]8;;file://%s\033\\%s\033]8;;\033\\' "${1// /%20}" "$2"
}

IFS=$'\x1f' read -r model ctx_pct cache cache_exp cache_tokens plan_label plan_pct plan_reset plan_len project worktree < <(
  echo "$input" | jq -r '
    ([(.rate_limits.five_hour // empty) + {label: "5h", len: 18000},
      (.rate_limits.seven_day // empty) + {label: "7d", len: 604800}] | max_by(.used_percentage)) as $plan
    | [
      (.model.display_name // "?"),
      (.context_window.used_percentage // 0 | floor),
      (.prompt_cache | if .caching_observed != true then "" elif .warm == true then "warm" else "cold" end),
      (.prompt_cache.expires_at // 0 | floor),
      (.prompt_cache.recache_tokens_if_cold // 0 | floor),
      ($plan.label // ""),
      ($plan.used_percentage // null | if . == null then "" else floor end),
      ($plan.resets_at // 0 | floor),
      ($plan.len // 0),
      (.workspace.project_dir // .cwd // ""),
      (.workspace.git_worktree // .worktree.name // "")
    ] | map(tostring) | join("\u001f")'
)

# Model and context
filled=$(( ctx_pct / 10 )); [ "$filled" -gt 10 ] && filled=10
on=""; off=""
for i in 1 2 3 4 5 6 7 8 9 10; do
  if [ "$i" -le "$filled" ]; then on+='█'; else off+='░'; fi
done
out="${model}${SEP}$(color "$ctx_pct")${on}${RESET}${DIM}${off}${RESET} ${ctx_pct}%"

# Prompt cache: the first message after expiry writes the whole prefix again
if [ -n "$cache" ] && [ "$cache_tokens" -ge "$CACHE_MIN_TOKENS" ]; then
  left=$(( cache_exp - now ))
  if [ "$cache" = warm ] && [ "$left" -gt 0 ]; then
    mins=$(( (left + 59) / 60 ))
    c=$YELLOW; [ "$mins" -le 1 ] && c=$RED
    out+=" ${c}⧗ ${mins} min${RESET}"
  else
    out+=" ${RED}⧗ cold${RESET}"
  fi
fi

# Plan usage (only for Pro/Max, after the first response)
if [ -n "$plan_pct" ]; then
  elapsed=$(( (plan_len - (plan_reset - now)) * 100 / plan_len ))
  ahead=""; [ "$plan_pct" -gt "$elapsed" ] && ahead="↑"
  out+="${SEP}${DIM}${plan_label}${RESET} $(color "$plan_pct")${plan_pct}%${ahead}${RESET}"
  r=$(until_reset "$plan_reset"); [ -n "$r" ] && out+=" $r"
fi

# Project as parent/name, just name when it sits in the home folder
if [ -n "$project" ]; then
  name=${project##*/}; parent=${project%/*}
  [ -n "$parent" ] && [ "$parent" != "$HOME" ] && name="${parent##*/}/$name"
  out+="${SEP}$(link "$project" "$name")"
fi

[ -n "$worktree" ] && out+="${SEP}🌿 ${worktree}"

printf '%s\n' "$out"
