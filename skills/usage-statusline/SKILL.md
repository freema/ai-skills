---
name: usage-statusline
description: "Install a Claude Code status line that shows the model, context fill as a coloured bar with tokens used, and on Pro/Max plans the 5-hour and 7-day usage with time until each limit resets. One install script copies it to a stable path and sets statusLine in ~/.claude/settings.json, backing the file up first. Use when the user wants to see context or plan usage at a glance, asks when their limit resets, or wants the same status line on another machine. Triggers: 'status line', 'statusline', 'show context usage', 'when does my limit reset', 'how much of my plan is left', 'install my status line', 'kolik mám kontextu', 'kdy se resetuje limit', 'dej mi statusline'."
---

# Usage Status Line

One line under the prompt:

```
Opus 5.5 │ ctx ████░░░░░░ 42% 84k/200k │ 5h 31% ↻2h13m │ 7d 12% ↻4d3h
```

| Part | Meaning |
| --- | --- |
| `Opus 5.5` | Current model |
| `ctx ████░░░░░░ 42%` | Context window fill. Green below 50 %, yellow to 80 %, red above |
| `84k/200k` | Tokens in the current context / window size |
| `5h 31% ↻2h13m` | Share of the 5-hour plan limit used, time until it resets |
| `7d 12% ↻4d3h` | The same for the 7-day limit |

The `5h` and `7d` parts come from the `rate_limits` field Claude Code passes to
status lines on Pro and Max plans. They appear after the session's first
response; API-key sessions never show them.

## Install

Requires `jq`. Run:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/install.sh"
```

It copies `scripts/statusline.sh` to `~/.claude/usage-statusline.sh` and sets
the top-level `statusLine` in `~/.claude/settings.json`. A plugin cannot set
that key itself, and the plugin's own path changes with every update, hence the
copy. Re-run the script after updating the plugin.

If a different status line is already configured, the script stops with exit
code 2 and prints the current command. Show it to the user and run with
`--force` only if they want it replaced; settings.json is backed up to
`settings.json.bak.<timestamp>` before any change. Honours `CLAUDE_CONFIG_DIR`.

The line shows up on the next refresh — after the next message, or after a
restart of Claude Code.

## Verify

Feed the script sample input; it should print one coloured line:

```bash
echo '{"model":{"display_name":"Opus 5.5"},"context_window":{"used_percentage":42,"context_window_size":200000,"current_usage":{"input_tokens":84000}}}' \
  | ~/.claude/usage-statusline.sh
```

`usage-statusline: jq not installed` means `jq` is missing from the `PATH`
Claude Code runs the status line with.
