---
name: graylog-search
description: >
  Search any Graylog instance from the CLI via its REST API. Use when debugging
  a production incident, verifying a deploy, or hunting an error in service
  logs aggregated in Graylog. Covers API-token auth, the universal search
  endpoints (relative/absolute/histogram/terms), Lucene query DSL, stream
  scoping, GELF/syslog level pitfalls, UTC time-window handling — and the
  deliverable: findings published as a shareable HTML report (Claude Artifact).
---

# Graylog Search

Query a Graylog log aggregator through its REST API instead of clicking through
the UI. Works with any Graylog 4/5/6 cluster that has API tokens enabled.

**This skill has two halves and both are expected: (1) query the logs,
(2) publish the findings as an HTML report artifact** — see
[Deliverable: HTML report artifact](#deliverable-html-report-artifact).
A search whose results never leave the terminal is an unfinished job.

## Configuration

The skill is instance-agnostic; everything specific to your cluster comes from
environment variables:

| Variable | Required | Meaning |
|---|---|---|
| `GRAYLOG_URL` | yes | Base URL, e.g. `https://graylog.example.com` (no trailing slash, no `/api`) |
| `GRAYLOG_API_TOKEN` | yes | Personal API token (Graylog UI: System → Users → your user → Edit tokens) |
| `GRAYLOG_STREAM_ID` | often | Stream to scope searches to — see [Stream scope](#stream-scope) |

If a required variable is not set, ask the user to provide it once per
session — do not invent or guess values. **Never commit a token to git.**

## Quick start — does my token work?

```bash
curl -sS -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  "$GRAYLOG_URL/api/system" | head -c 400
```

Expect HTTP 200 and JSON with `lifecycle: "running"`. A 401 means the token is
invalid or expired — ask the user to regenerate one in the Graylog UI.

## Auth

All API calls use HTTP Basic with `<token>:token` — the literal word `token`
as the password. Required headers on every call:

- `Accept: application/json`
- `X-Requested-By: cli` (Graylog CSRF guard; any non-empty value works)

## Stream scope

On many clusters, token permissions are granted **per stream**, and a search
without a stream filter returns **`Not authorized`** (even with a valid token)
or misleading empty results. If that happens, scope every
`/search/universal/…` call to a stream:

```
--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"
```

Find stream ids with `GET /api/streams`, or in the Graylog UI: **Streams** →
open the stream → the id is in the URL (`…/streams/<STREAM_ID>/…`).

## Endpoints that matter

| Endpoint | When |
|---|---|
| `GET /api/search/universal/relative?query=…&range=…` | "Last N seconds" — `range` in seconds (3600 = 1h, 86400 = 24h) |
| `GET /api/search/universal/absolute?query=…&from=…&to=…` | Specific window; `from`/`to` ISO-8601 UTC |
| `GET /api/search/universal/relative/histogram?…&interval=hour` | Count over time |
| `GET /api/search/universal/relative/terms?…&field=…&size=…` | Terms aggregation — top values for a field |
| `GET /api/streams` | List streams and their ids |
| `GET /api/system` | Health/auth check |

Add `filter=streams:…` to every search call if your cluster needs it (above).

Always pass `&limit=200` (or smaller) and a `&fields=…` list (e.g.
`timestamp,source,level,message`) so you don't pull full message payloads —
Graylog can return huge GELF blobs otherwise and blow up your context window.

## Discover the field schema first

Field names vary by log shipper (Monolog GelfHandler, logstash, fluentd,
nxlog, …), and guessing them is the #1 source of silent empty results. Before
building real queries, pull **one raw message** and look at its keys:

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/relative" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode "query=*" \
  --data-urlencode "range=3600" \
  --data-urlencode "limit=1" \
  | jq '.messages[0].message | keys'
```

Things to establish from that sample:

- **Which field identifies the service** — `application`, `project`, `service`,
  `facility`, `container_name`… there is no universal convention.
- **What `level` means.** GELF proper uses **syslog severity 0–7, lower =
  more severe** (0=EMERG … 3=ERROR … 7=DEBUG), so "errors and worse" is
  `level:<=3`. But some pipelines ship raw framework levels (Monolog
  100–500, higher = worse). Look at actual values before filtering — the
  wrong assumption matches nothing and looks like "no errors".
- **`message` vs `short_message`** — some clusters index both, some only one.
- Field names are **case-sensitive** and usually snake_case in the query DSL.

To enumerate services/values live, use a terms aggregation on the candidate
field (recipe 4 with `field=<your service field>`).

## Query DSL cheatsheet

Graylog uses a Lucene-like syntax:

```
service:checkout AND level:<=3
service:checkout AND ("connection refused" OR "timeout")
service:api AND env:prod AND NOT level:7
source:worker-* AND message:/Connection.*refused/
```

- Quoted strings = phrase match. Bareword = single token.
- Wildcards: `*` and `?`. Leading `*` is allowed but slow.
- Regex: `/.../` (slow, last resort).
- Numeric ranges: `level:[0 TO 3]` or `level:<=3`.
- Combine with `AND`, `OR`, `NOT` (uppercase).

## Time windows — read this before searching

- Whatever timezone the Graylog server displays in the UI, **the API speaks
  UTC**. `from`/`to` must be ISO-8601 UTC, and the `timestamp` field you get
  back is UTC.
- When converting a local incident time ("yesterday 16:00") to UTC, mind DST —
  a one-hour offset error makes you search the wrong window and conclude the
  bug "didn't fire".
- If unsure of the server's zone, check `GET /api/system` (`timezone` field).

## Recipes

All recipes assume `GRAYLOG_URL`, `GRAYLOG_API_TOKEN` and (if needed)
`GRAYLOG_STREAM_ID` are exported, and use `service` as the service-identifying
field — substitute your own (see field discovery above).

### 1. Is service X erroring right now? (last 1h, errors only)

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/relative" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode "query=service:checkout AND level:<=3" \
  --data-urlencode "range=3600" \
  --data-urlencode "limit=50" \
  --data-urlencode "fields=timestamp,level,source,message" \
  | jq '.messages[].message | {timestamp, level, source, msg: .message}'
```

### 2. Did a specific exception fire after the deploy? (absolute window)

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/absolute" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode 'query=service:checkout AND "Failed to fetch mailing list"' \
  --data-urlencode "from=2026-05-11T08:00:00.000Z" \
  --data-urlencode "to=2026-05-11T12:00:00.000Z" \
  --data-urlencode "limit=200" \
  --data-urlencode "fields=timestamp,source,message"
```

### 3. Count errors per hour over last 24h (post-deploy verification)

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/relative/histogram" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode "query=service:checkout AND level:<=3" \
  --data-urlencode "range=86400" \
  --data-urlencode "interval=hour" \
  | jq '.results | to_entries | map({h: (.key|tonumber|strftime("%m-%d %HZ")), count: .value}) | sort_by(.h)'
```

### 4. Find the noisy pod / host / value

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/relative/terms" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode "query=level:<=3" \
  --data-urlencode "range=3600" \
  --data-urlencode "field=source" \
  --data-urlencode "size=20"
```

### 5. Tail-equivalent: most recent N lines for a service

```bash
curl -sS -G "$GRAYLOG_URL/api/search/universal/relative" \
  -u "$GRAYLOG_API_TOKEN:token" \
  -H "Accept: application/json" -H "X-Requested-By: cli" \
  ${GRAYLOG_STREAM_ID:+--data-urlencode "filter=streams:$GRAYLOG_STREAM_ID"} \
  --data-urlencode "query=service:checkout" \
  --data-urlencode "range=900" \
  --data-urlencode "limit=50" \
  --data-urlencode "sort=timestamp:desc" \
  --data-urlencode "fields=timestamp,level,source,message"
```

## Helper script

`scripts/gl-search.sh` wraps the most common case (relative window, fixed
fields, jq one-line formatting):

```bash
./scripts/gl-search.sh 'service:checkout AND level:<=3' 3600
./scripts/gl-search.sh '"OutOfMemory"' 900 200
```

## Deliverable: HTML report artifact

The deliverable of an investigation is a **link to a readable HTML report**,
not a wall of JSON in the terminal. After a search that returns data, publish
the findings with the `Artifact` tool — proactively, without being asked. Skip
only when the user explicitly declines, or when the search returned zero rows
(then just say so in chat).

Workflow:

1. Run the searches. Collect headline numbers (total hits, errors vs.
   warnings, affected hosts), the histogram, and the relevant log lines.
2. Write **one self-contained HTML file** in a temp/scratchpad location —
   never in the user's repo.
3. Publish with the `Artifact` tool: stable emoji `favicon` (use 🪵), a
   one-sentence `description`, a `<title>` inside the HTML.
4. Reply with the link plus a 3–5 line summary. Artifacts are private by
   default; the user shares from the page itself.
5. Follow-up searches in the same investigation: update the same file and
   republish the same path — the URL stays stable. Keep the favicon unchanged.

Page structure, top to bottom: header (service + time window + as-of date),
2–4 stat tiles, key-insight callout (the sentence you'd post in the incident
channel), histogram, log table (timestamp UTC, level, source, message
truncated to ~200 chars, status chips for errors), footer with the **exact
query, stream id, window and limit** so anyone can reproduce the search 1:1.

Content rules:

- **No PII** — mask IPs, drop user agents and referrers unless they are the
  finding itself, redact emails inside message bodies.
- Both light and dark theme: tokens on `:root`, overridden in
  `@media (prefers-color-scheme: dark)` and `:root[data-theme="dark"]` /
  `:root[data-theme="light"]`.
- Artifacts run under a strict CSP — no external fonts, scripts, or images.
  Wide tables go in a `div` with `overflow-x: auto`.
- Don't emit `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` — the publisher wraps
  the file; start with `<title>` + `<style>` + content.

**If the `Artifact` tool is not available** in the current harness (older
Claude Code, artifacts disabled by org policy), do **not** silently drop the
report: write the same HTML file, give the user its absolute path ("open this
in a browser"), and mention that updating Claude Code brings the Artifact
tool. A missing tool is never a reason to fall back to a terminal-only answer.

The companion skill `publish-report-artifact` (same marketplace) has a full
house-style template if you want a more polished report.

## Pitfalls

- **Wrong `level` scale** — the single most common mistake. On GELF-normalised
  clusters `level:>=400` matches nothing (levels are 0–7, lower = worse); on
  raw-Monolog clusters `level:<=3` matches nothing. Check a sample message.
- **Wrong service field** — `application:foo` vs `service:foo` vs
  `project:foo`; a wrong field name returns zero rows, not an error. Field
  names are case-sensitive.
- **`Not authorized` on search but `/api/system` works** — almost always a
  missing `filter=streams:<id>`; the token can't search outside its streams.
  Add the filter and retry; if it still fails, check the stream's reader
  permissions in the Graylog UI.
- **GELF UDP can drop messages** under load. If you expect logs that aren't
  there, also check the source directly (`kubectl logs`, journald) before
  concluding the bug didn't fire.
- **Don't paginate huge result sets** — if you need >500 rows, narrow the
  query (tighter time window, more specific phrase) instead.
- **Quoting in shell** — prefer `--data-urlencode` over inline `?query=…`,
  otherwise `&`, `:`, and spaces get mangled.

## What this skill is NOT for

- Streaming live logs — the Graylog API has no SSE/tail. Poll with small
  windows (`range=60`) for near-real-time, or use the Graylog UI.
- Modifying streams, alerts, or dashboards — those go through the Graylog UI.
