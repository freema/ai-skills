# Setup

## Status line

A plugin cannot set the top-level `statusLine` key — Claude Code accepts only
`agent` and `subagentStatusLine` from a plugin's `settings.json`. So this one
step is manual.

Marketplace installs live in version-scoped directories, so a path pasted
directly into settings dies on every plugin update. Install a tiny stable
wrapper once instead:

```bash
cat > ~/.claude/context-guard-statusline.sh <<'EOF'
#!/usr/bin/env bash
exec bash "$(find ~/.claude/plugins -name statusline.sh -path '*context-guard*' | sort | tail -1)"
EOF
chmod +x ~/.claude/context-guard-statusline.sh
```

Then add to `~/.claude/settings.json`:

```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/context-guard-statusline.sh",
    "padding": 1
  }
}
```

The wrapper resolves the newest installed copy at each run, so plugin updates
take effect without touching settings again.

Output looks like this:

```
Opus 5 · lustirna · ctx 78% (156K tok) · ↑~609K/turn ⚠ · log 11M · $4.21
```

`↑~609K/turn` is the number that matters: roughly what leaves the machine on
every message. It turns red past the warning threshold. Context percentage is
green below 50%, yellow to 80%, red above. `log` is the on-disk transcript,
which is append-only — after `/compact` the context figures drop while `log`
keeps its size; that divergence is normal.

## Configuration

All optional, all environment variables. Numeric knobs must be integers —
non-integer values fall back to the default rather than breaking the display.

| Variable | Default | Effect |
| --- | --- | --- |
| `CONTEXT_GUARD_WARN_KB` | `500` | Per-turn upload at which the status line turns red |
| `CONTEXT_GUARD_WARN_MB` | `5` | Step size between hook warnings (content since last compaction) |
| `CONTEXT_GUARD_BYTES_PER_TOKEN` | `4` | Estimate multiplier for the per-turn figure |
| `CONTEXT_GUARD_NO_COLOR` | unset | Set to `1` to disable ANSI colour (`NO_COLOR` is honoured too) |

## Components

| File | Role |
| --- | --- |
| `scripts/statusline.sh` | Reads the status line JSON on stdin, prints one line |
| `scripts/warn-context.sh` | `UserPromptSubmit` hook; warns per 5 MB step of post-compaction content, keeps per-session state in `$TMPDIR/context-guard` |
| `scripts/scan-sessions.sh` | Scans running sessions; optional argument is the sample window in seconds (default 5) |
| `hooks/hooks.json` | Wires the hook to `UserPromptSubmit` |

## Implementation notes

Platform details that are easy to get wrong, all found by testing:

- **`nettop -d -l 2` emits two blocks.** The first is cumulative since process
  start, the second is the delta over the sample window. Only the second is a
  rate. Reading the first reports a long-lived session's lifetime total as if it
  were per-second traffic. The scan also passes `-x` so nettop emits raw
  integer bytes and no KiB/MiB unit parsing is needed.
- **Session discovery can't rely on the process name alone.** `pgrep -x claude`
  misses sessions whose kernel accounting name carries the CLI version, and npm
  installs run as `node .../cli.js`. The scan matches the full command line.
- **Transcript paths slugify every non-alphanumeric character.** The project
  `/a/my_app.v2` maps to `~/.claude/projects/-a-my-app-v2` — dots, spaces and
  `@` become hyphens too, not just slashes and underscores. Very long paths are
  additionally truncated with a hash suffix.
- **The transcript `.jsonl` is append-only.** `/compact` writes a summary
  record into the same file and keeps appending, so file size overstates live
  context after any compaction. The hook therefore measures bytes since the
  last compact marker, not total size.

`awk` follows the locale's decimal separator, so the scripts force `LC_ALL=C`;
under `cs_CZ` a cost renders as `$4,21` and a size as `1,5G` otherwise.
