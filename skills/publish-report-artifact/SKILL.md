---
name: publish-report-artifact
description: >
  Publish analysis results as a polished, shareable web page (Claude Artifact)
  instead of pasting a markdown table into the terminal. Use when the deliverable
  is a report, audit, data table, comparison, incident timeline, or migration
  inventory that the user will share with colleagues (management, product,
  non-developers). Triggers on: "make a report", "share this with the team",
  "prepare something I can send", or whenever an analysis produces a table or
  findings worth reading outside the terminal. Covers page structure, PII rules
  for aggregated data, a token-based house style with light/dark themes, and the
  publish/update workflow.
disable-model-invocation: true
---

# Publish a report as an Artifact

When an analysis produces something colleagues will read — a data audit, an
incident timeline, a reconciliation report, a comparison — the deliverable is a
**link to a readable page**, not a wall of terminal markdown. Claude Code's
`Artifact` tool publishes a self-contained HTML file to a private claude.ai URL;
the user shares it from the page's share menu.

Proactively offer this whenever the output is a shareable table or report.
Don't wait to be asked.

## Workflow

1. Build the page as a **single HTML file** in the session scratchpad directory
   (never in the user's repo).
2. Publish with the `Artifact` tool: set a stable emoji `favicon`, a one-sentence
   `description`, and a `<title>` in the HTML.
3. Reply with the link plus a 3–5 line summary of what's inside. The artifact is
   private by default — mention that sharing is done from the page itself.
4. Updates: republish the **same file path** in the same conversation (keeps the
   URL); from another conversation pass the original URL as `url`. Keep the
   favicon stable across updates — people find their tab by its icon.

No `Artifact` tool in your harness? Write the same HTML file and give the user
its path instead.

## Page structure (in this order)

1. **Header** — eyebrow label (`AREA · SYSTEM · internal`), H1 with the subject
   **and the as-of date**, short lede: what the data is, where it came from,
   what the reader should do with it.
2. **Stat tiles** — 2–4 headline numbers with one-line explanations. This is
   what management reads; make the numbers carry the story.
3. **Key-insight callout** — the one paragraph you'd say out loud in a meeting
   (root cause, "it is NOT caused by X", decision needed).
4. **Detail table(s)** — the full data, one row per entity, with status chips
   for anomalies (`mixed values`, `placeholder image`, `all empty`, …).
5. **Footer** — data source, scan date/method, caveats, how to reproduce.

## Content rules

- **Write in the reader's language, for non-developers.** Name things by what
  people recognize (mailing, contact, editor), not by API nouns.
- **Aggregates only, never PII.** No e-mail addresses, tokens, or per-person
  rows with identifying data — values + counts, or hashes where correlation is
  needed. Say so on the page ("Data is aggregated — no personal addresses").
- Use the reader's locale for numbers (thousands separator, `%` spacing) and
  `tabular-nums` wherever digits align.
- Flag anomalies visually (chips), don't bury them in prose.

## House style

Start from `references/report-template.html` (proven skeleton — token-based
palette, both themes, sticky table header, chips, stat tiles) and replace the
content. The palette is **brand-neutral by design** — swap `--accent` (and, if
you have them, the semantic tokens) for your brand's values:

| Token | Light | Dark | Role |
|---|---|---|---|
| `--paper` / `--ink` | `#FBFAF7` / `#22242A` | `#17181C` / `#E7E5E0` | ground / text |
| `--accent` | `#2456A6` | `#6FA3F0` | brand accent — header rule, eyebrow, callout bar |
| `--warn-fg` | `#92580A` | `#E4A64C` | anomaly chips, elevated percentages |
| `--crit-fg` | `#A50F27` | `#F2778A` | critical chips (100 % empty, broken data) |
| `--ok-fg` | `#1A7F4B` | `#55B583` | healthy states |

Technical constraints that will bite you if ignored:

- **CSP blocks all external resources** — no webfonts, CDN scripts, or remote
  images (external `<a href>` links are fine). System font stack only, or
  inline a face as a data URI.
- **Both themes**: define tokens on `:root`, override in
  `@media (prefers-color-scheme: dark)` AND in `:root[data-theme="dark"]` /
  `:root[data-theme="light"]` — the viewer's toggle must win in both directions.
- Wide tables go inside a `div` with `overflow-x: auto`; the page body must
  never scroll horizontally.
- Don't emit `<!DOCTYPE>`, `<html>`, `<head>`, `<body>` — the publisher wraps
  the file; start with `<title>` + `<style>` + content.
