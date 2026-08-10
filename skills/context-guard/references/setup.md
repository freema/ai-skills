# Setup

## Status line

A plugin cannot set the top-level `statusLine` key — Claude Code accepts only
`agent` and `subagentStatusLine` from a plugin's `settings.json`. So this one
step is manual.

Find the installed path first, since marketplace installs are versioned:

```bash
find ~/.claude/plugins -name statusline.sh -path '*context-guard*'
```

Then add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "/absolute/path/from/the/find/above/statusline.sh",
    "padding": 1
  }
}
```

Output looks like this:

```
Opus 5 · lustirna · ctx 78% (152K tok) · ↑~609K/turn ⚠ · log 11M · $4.21
```

`↑~609K/turn` is the number that matters: roughly what leaves the machine on
every message. It turns red past the warning threshold. Context percentage is
green below 50%, yellow to 80%, red above.

## Configuration

All optional, all environment variables:

| Variable | Default | Effect |
| --- | --- | --- |
| `CONTEXT_GUARD_WARN_KB` | `500` | Per-turn upload at which the status line turns red |
| `CONTEXT_GUARD_WARN_MB` | `5` | Transcript step size between hook warnings |
| `CONTEXT_GUARD_BYTES_PER_TOKEN` | `4` | Estimate multiplier for the per-turn figure |
| `CONTEXT_GUARD_NO_COLOR` | unset | Set to `1` to disable ANSI colour (`NO_COLOR` is honoured too) |

## Components

| File | Role |
| --- | --- |
| `scripts/statusline.sh` | Reads the status line JSON on stdin, prints one line |
| `scripts/warn-context.sh` | `UserPromptSubmit` hook; warns per 5 MB step, keeps per-session state in `$TMPDIR/context-guard` |
| `scripts/scan-sessions.sh` | Scans running sessions; optional argument is the sample window in seconds (default 5) |
| `hooks/hooks.json` | Wires the hook to `UserPromptSubmit` |

## Implementation notes

Three platform details that are easy to get wrong, all found by testing:

- **`nettop -d -l 2` emits two blocks.** The first is cumulative since process
  start, the second is the delta over the sample window. Only the second is a
  rate. Reading the first reports a long-lived session's lifetime total as if it
  were per-second traffic.
- **`pgrep -x claude` misses sessions.** On macOS the kernel accounting name can
  carry the CLI version rather than `claude`, so some running sessions never
  match. Matching `ps ax -o pid=,comm=` finds all of them.
- **Transcript paths slugify underscores as well as slashes.** The project
  `/a/my_app` maps to `~/.claude/projects/-a-my-app`. Converting only slashes
  silently finds nothing for any project with an underscore in its path.

`awk` follows the locale's decimal separator, so the scripts force `LC_ALL=C`;
under `cs_CZ` a cost renders as `$4,21` and a size as `1,5G` otherwise.
