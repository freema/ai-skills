---
name: lighthouse
description: "Run local Lighthouse perf audits on PixelDen dev server (localhost:3002). Use when the user asks about Lighthouse, LCP, FCP, CLS, INP, Core Web Vitals, performance score, perf regression, or wants to verify a perf fix locally before release. Triggers: 'lighthouse', 'LCP', 'CWV', 'perf test', 'pustit lighthouse', 'otestovat perf'."
---

# Lighthouse Local Perf Testing

Locally audit Core Web Vitals and Lighthouse scores against the dev server **before** every release / perf-related PR.

## Quick run

```bash
task lighthouse           # mobile, simulated throttling (most relevant for LCP/SEO)
task lighthouse:desktop   # desktop preset (best-case numbers)
```

Reports land in `.lighthouse/` (gitignored):

- `.lighthouse/mobile.report.html` + `mobile.report.json`
- `.lighthouse/desktop.report.html` + `desktop.report.json`

## Pre-flight checklist

1. **Dev server must be up:** `task dev` (Docker, listens on `localhost:3002` per memory).
2. **Chrome on host:** Lighthouse runs headlessly via `npx --yes lighthouse` against the host's Chrome — not in container. macOS users typically have it.
3. **First run downloads ~70MB** of lighthouse bin into `~/.npm/_npx`. Subsequent runs are fast.

## Reading results — extract metrics from JSON

The HTML report is for humans. For Claude, parse the embedded JSON to surface key numbers concisely:

```bash
# mobile (clean JSON file)
node -e '
const r = JSON.parse(require("fs").readFileSync(".lighthouse/mobile.report.json", "utf8"));
const a = r.audits, c = r.categories;
console.log("=== Scores ==="); for (const [k,v] of Object.entries(c)) console.log(k.padEnd(15), Math.round((v.score??0)*100));
const fmt = (k,t=v=>v.toFixed(0)+" ms") => a[k]?.numericValue!==undefined ? t(a[k].numericValue) : "n/a";
console.log("\n=== Core Web Vitals ===");
console.log("LCP        ", fmt("largest-contentful-paint"));
console.log("FCP        ", fmt("first-contentful-paint"));
console.log("CLS        ", fmt("cumulative-layout-shift", v=>v.toFixed(3)));
console.log("TBT        ", fmt("total-blocking-time"));
console.log("Speed Index", fmt("speed-index"));
console.log("TTFB       ", fmt("server-response-time"));
'
```

## Dev vs prod expectations

The dev server runs **Vite dev mode** — un-minified ESM, large `node_modules/.vite/deps/*.js` shipments (lucide-react ~1MB, sentry ~1MB, react-dom ~1MB). So:

| | Dev (localhost) | Prod (after deploy) |
|---|---|---|
| Performance (mobile) | 80–88 | 90+ |
| LCP (mobile) | 3–4s | 1.5–2s |
| TTFB | 300–500ms | <100ms |
| Network total | 3–5MB | 500KB–1MB |

**Rule of thumb:** prod LCP ≈ dev LCP × 0.5. If dev LCP is good (< 4s) and there's no obvious render-blocking, prod will pass CWV.

## When dev numbers aren't enough

For tighter prod-like measurement, run against a local prod build:

```bash
task build
docker compose exec app pnpm start &   # or run on host via PORT=3002 pnpm start
task lighthouse
```

For real-world prod numbers post-deploy, use the `metrifyr` MCP (`mcp__metrifyr__psi_analyze`) — it hits the public URL with field/lab data and CrUX.

## What to flag in a Lighthouse report

| signal | what it means | look for |
|---|---|---|
| LCP > 2.5s | hero/above-fold image slow or render-blocked | `lcp-lazy-loaded`, `largest-contentful-paint-element`, `prioritize-lcp-image` |
| CLS > 0.1 | layout shifting | `layout-shifts`, missing `width`/`height` on `<img>` |
| TBT > 200ms | JS work blocking input | `bootup-time`, `mainthread-work-breakdown`, `unused-javascript` |
| FCP > 2s | first paint slow | `render-blocking-resources`, font loading |
| SEO < 100 | meta/markup issues | `meta-description`, `crawlable-anchors`, `hreflang` |

## Common PixelDen pitfalls (already known)

- **Hero image as CSS `background-image`** — can never be optimal LCP. Always use `<img>` with `srcset`, `width/height`, `fetchPriority="high"`. (Fixed in v0.2.7.)
- **Public assets (`public/assets/**`) are NOT fingerprinted by Vite.** Combined with `Cache-Control: immutable, max-age=31536000` in nginx, content changes need either a filename bump (`-v2.webp`) or a manual nginx purge. See [Nginx static cache trap](../../../../.claude/projects/-Users-tomasgrasl-projects-nodejs-pixelden/memory/feedback-nginx-static-cache.md) memory.
- **`game-canvas` useEffect deps** can re-mount Phaser unnecessarily. Verify before blaming network.

## When NOT to use this skill

- The user is asking about prod / live-site perf → use `mcp__metrifyr__psi_analyze` instead (PSI doesn't work against `localhost`).
- The user wants accessibility/a11y deep-dive → use the `chrome-devtools-mcp:a11y-debugging` skill (Lighthouse a11y category is shallow).
- The user wants traces (call stacks, long tasks frame-by-frame) → use `mcp__chrome-devtools__performance_start_trace`.

## After running

Always summarize:

1. Top-line scores (Performance / SEO / A11y / BP).
2. Each Core Web Vital with rating (good / needs-improvement / poor).
3. Top 1–3 opportunities (`audits` with `details.overallSavingsMs > 100`).
4. If LCP > 2.5s on mobile, identify the LCP element via `largest-contentful-paint-element` audit.
5. **Don't forget**: dev numbers ≠ prod numbers. State both expected.
