---
name: context-guard
description: "Diagnose Claude Code sessions that saturate your uplink and add latency to the whole network. Claude Code re-uploads the entire context on every turn, so a long-lived session can sustain hundreds of KB/s upstream and fill the router's WAN queue. Scans running sessions, separates bufferbloat from real hardware faults, and installs a status line and warning hook. Use when the user reports slow internet, high ping, lag or an unstable connection while Claude Code is running, or asks which session is eating bandwidth. Triggers: 'slow internet', 'high latency', 'high ping', 'network is lagging', 'what is eating my bandwidth', 'why is my connection slow', 'bufferbloat', 'pomalý internet', 'vysoká latence', 'seká mi to', 'co mi žere linku', 'proč mi padá net'."
---

# Context Guard

Claude Code re-sends the whole conversation — every prior message and every tool
result — on each turn. Prompt caching cuts server-side compute and cost, but not
bytes on the wire: the client still serialises the full message array into every
request. Upload volume therefore scales with **total context size**, not with the
length of what was just typed. A 50-character prompt can push half a megabyte
upstream.

A session left running for days sustains hundreds of KB/s upstream. That fills a
consumer router's WAN queue, and once it is full every device on the network pays
the queuing delay — including devices on Ethernet, which is why the symptom looks
like a broken router. There is no built-in bandwidth readout and no metered mode
([claude-code#55411](https://github.com/anthropics/claude-code/issues/55411)).

## Diagnose

1. Scan the running sessions:

   ```bash
   "${CLAUDE_PLUGIN_ROOT}/scripts/scan-sessions.sh"
   ```

   Flag any session uploading above ~200 KB/s or whose newest log is over
   ~5 MB. Note its PID, uptime, directory and the SESSION column — that value
   is the id `claude --resume` takes. Sessions sharing a directory share the
   NEWEST-LOG figure, so treat it as the directory's worst case, not the PID's.

2. Confirm the mechanism before blaming a session. Compare latency **to** the
   router against latency **past** it:

   ```bash
   GW=$(route -n get default 2>/dev/null | awk '/gateway/ {print $NF}')
   [ -n "$GW" ] || GW=$(ip route show default 2>/dev/null | awk '{print $3; exit}')
   [ -n "$GW" ] && ping -c 20 -i 0.3 "$GW" || echo "no default gateway found — skip the router comparison"
   ping -c 20 -i 0.3 1.1.1.1
   ```

   | Result | Meaning |
   | --- | --- |
   | Router ~1 ms, beyond it high and erratic | Saturated uplink — bufferbloat. A busy session is a plausible cause |
   | Router also slow or lossy | Local fault: Wi-Fi, cabling, or the router. A busy session is **not** the explanation |
   | Both fine | Look elsewhere; do not blame a session on transcript size alone |

   The signature of bufferbloat is a low minimum with a huge spread — for
   example `min 66 ms / avg 363 ms / max 1364 ms`. The minimum proves the line
   can be fast; the spread is queue time.

3. Report what was measured, then recommend in this order:
   - `/compact` in the offending session — collapses context, keeps the thread
   - end and resume — `kill <pid>`, then `claude --resume <session-id>`, where
     the session id is the SESSION column from the scan (it is the transcript's
     filename). Use plain `kill`; `kill -9` can cost the tail of the
     transcript, which is exactly what the user wanted to keep
   - start fresh for unrelated work instead of extending a days-old session

## Install the always-on parts

The warning hook ships with this skill and runs automatically once the plugin is
installed: it fires on each prompt and speaks up every time the content
accumulated since the session's last compaction crosses another 5 MB step —
measuring from the last compact marker, not raw file size, so `/compact`
actually silences it until the context regrows.

The status line needs one manual step — a plugin cannot set the top-level
`statusLine` key, because Claude Code accepts only `agent` and
`subagentStatusLine` from a plugin's `settings.json`. See
[references/setup.md](references/setup.md) for the exact snippet, the installed
path, and the configuration variables.

## Interpreting the numbers

- **What is re-uploaded every turn is the live context**, not the transcript
  file. The `.jsonl` on disk is an append-only log — `/compact` writes a
  summary record and the file keeps growing — so its size is an upper bound
  that overstates a compacted session. The hook measures content since the
  last compact marker; the status line reads live token counts.
- **Upload/s is a short sample and is bursty.** A session reading 0 B/s between
  turns can still spike to hundreds of KB/s during one. Never conclude a session
  is idle from a single sample.
- **The per-turn estimate is `total_input_tokens × 4 bytes`**, approximating the
  serialised request body. It excludes TCP retransmits, which add roughly 10% on
  a clean link and more on a lossy one. Treat it as an order of magnitude.

## Constraints

- `scan-sessions.sh` reads only. Never kill a session without explicit
  confirmation — the user may have work in progress.
- `nettop` and `lsof` are macOS-only. On Linux the scan prints `n/a` in the
  UPLOAD/S column and falls back to log sizes; report it that way rather than
  as zero. The gateway lookup in step 2 covers both `route` (macOS) and
  `ip route` (Linux).
- Do not send the user to their ISP on the strength of a latency reading alone.
  If ping to their own router is healthy, the line and the router are working,
  and a support call will measure a clean line and close the ticket.
