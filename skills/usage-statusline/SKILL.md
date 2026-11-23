---
name: usage-statusline
description: "Install a Claude Code status line that shows the model, context fill as a coloured bar, a countdown until the prompt cache goes cold, on Pro/Max plans the 5-hour and 7-day usage with time until each limit resets, the project folder (clickable), git worktree and the logged-in account. One install script copies it to a stable path and sets statusLine in ~/.claude/settings.json, backing the file up first. Use when the user wants to see context, cache or plan usage at a glance, asks when their limit resets or when the cache expires, or wants the same status line on another machine. Triggers: 'status line', 'statusline', 'show context usage', 'when does my limit reset', 'when does the cache expire', 'how much of my plan is left', 'install my status line', 'kolik mám kontextu', 'kdy se resetuje limit', 'kdy vyprší cache', 'dej mi statusline'."
---

# Usage Status Line

One line under the prompt:

```
Opus 5.5 │ ████░░░░░░ 42% ⧗ 12 min │ 5h 73%↑ ↻1h48m │ 7d 41% ↻4d3h │ www/reglog3 │ 🌿 rule-fixes │ you@example.com
```

| Part | Meaning |
| --- | --- |
| `Opus 5.5` | Current model |
| `████░░░░░░ 42%` | Context window fill. Green below 50 %, yellow to 80 %, red above. When it fills up, Claude starts losing details |
| `⧗ 12 min` | Prompt cache expires in 12 minutes; the next message after that writes the whole context again and costs many times more. Shown only when at least 50k tokens would be re-cached, `⧗ cold` once it has expired |
| `5h 73%↑ ↻1h48m` | Plan usage in the 5-hour window and time until it resets. `↑` means usage is running ahead of the clock: more of the limit is used than of the window has passed |
| `7d 41% ↻4d3h` | The same for the 7-day limit |
| `www/reglog3` | Project folder as parent/name (just the name when it sits in the home folder), click to open it |
| `🌿 rule-fixes` | Git worktree, only when working in a linked one |
| `you@example.com` | The claude.ai account Claude Code is logged in with (`oauthAccount` in `~/.claude.json`), each account in its own colour picked from a hash of the address, so a switch shows at a glance. Six colours, so two accounts can share one. Hidden with an API key |

The cache and plan parts come from the `prompt_cache` and `rate_limits` fields
Claude Code passes to status lines. They appear after the session's first
response; plan usage only on Pro and Max, never in API-key sessions. Clicking
the project needs a terminal with OSC 8 links (iTerm2, Ghostty, WezTerm, kitty,
VS Code); elsewhere it is plain text.

## Install

Requires `jq`. Run:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/install.sh"
```

It copies `scripts/statusline.sh` to `~/.claude/usage-statusline.sh` and sets
the top-level `statusLine` in `~/.claude/settings.json`, with
`refreshInterval: 30` so the countdowns tick while the session is idle (a value
already there is kept). A plugin cannot set that key itself, and the plugin's
own path changes with every update, hence the copy. Re-run the script after
updating the plugin.

If a different status line is already configured, the script stops with exit
code 2 and prints the current command. Show it to the user and run with
`--force` only if they want it replaced; settings.json is backed up to
`settings.json.bak.<timestamp>` before any change. Honours `CLAUDE_CONFIG_DIR`.

The line shows up on the next refresh — after the next message, or after a
restart of Claude Code.

## Verify

Feed the script sample input; it should print one coloured line with every part:

```bash
now=$(date +%s)
echo '{"model":{"display_name":"Opus 5.5"},"workspace":{"project_dir":"/tmp/demo","git_worktree":"rule-fixes"},"context_window":{"used_percentage":42},"prompt_cache":{"caching_observed":true,"warm":true,"expires_at":'$((now+700))',"recache_tokens_if_cold":180000},"rate_limits":{"five_hour":{"used_percentage":73,"resets_at":'$((now+6480))'},"seven_day":{"used_percentage":41,"resets_at":'$((now+356400))'}}}' \
  | ~/.claude/usage-statusline.sh
```

`usage-statusline: jq not installed` means `jq` is missing from the `PATH`
Claude Code runs the status line with.
