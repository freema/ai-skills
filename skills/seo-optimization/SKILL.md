---
name: seo-optimization
description: "Apply 2026 on-page SEO best practices for the PixelDen Games portal — titles, meta, OG tags, schema.org structured data, canonicals, hreflang, and brand entity differentiation. Use when adding a new route, rewriting titles/metas, adding/updating JSON-LD, debugging SERP appearance, auditing an existing page, or wiring i18n alternates. Tech stack: React Router v7 + TypeScript + i18n (en/de/es). Triggers: 'SEO', 'meta tags', 'title tag', 'schema', 'JSON-LD', 'OG', 'Open Graph', 'canonical', 'hreflang', 'rich results', 'rich snippet', 'AI search', 'GEO', 'AEO', 'brand SEO'."
---

# SEO Optimization Skill — PixelDen Games

Practical, opinionated 2026 SEO rules for this codebase. Read the **Quick Checklist** first; jump into a section only when you need the detail. Cite the source URLs in §13 if you have to defend a decision.

---

## Quick checklist (apply on every new route or content rewrite)

- [ ] `<title>` follows the per-page-type template (see §1) and stays ≤ 580 px / ~55 chars
- [ ] Meta `description` present, 130–160 chars, leads with the benefit + action verb, includes primary keyword once
- [ ] Open Graph: `og:title`, `og:type`, `og:image` (absolute URL, 1200×630), `og:url` (= canonical), `og:site_name`, `og:description`
- [ ] Twitter: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`, `twitter:site` (and `twitter:image:alt` if image is content)
- [ ] `<link rel="canonical">` set to a **self-referencing absolute URL** that matches the rendered locale prefix
- [ ] JSON-LD added (one or more of: `WebSite`, `Organization`, `BreadcrumbList`, `VideoGame` co-typed, `BlogPosting`)
- [ ] `hreflang` alternates emitted for **all** of `en`, `de`, `es`, plus `x-default` → en
- [ ] All `<img>` have `alt` (descriptive) **or** `alt=""` + `aria-hidden="true"` if purely decorative
- [ ] Above-the-fold image is `<img>` with explicit `width`/`height` and `fetchPriority="high"` (LCP); never CSS `background-image`
- [ ] No `noindex` accidentally left in original code (see §11.5)
- [ ] Brand string is **exactly** "PixelDen Games" (with "PixelDen" as `alternateName`); never lowercase "pixelden games" or "pixel den"

> If you can't tick something, write a one-line comment in the route file explaining why (e.g. `// no og:image: blog post still needs hero asset, T-123`).

---

## §1 Title tags

### Length

- Target **580 pixels** width (Google truncates by pixels, not characters). That's roughly **50–55 chars** for typical Latin text, longer if the title is i-l-t-heavy, shorter if W-M-uppercase-heavy.
- Hard cap at **60 chars** as a safe rule of thumb. Anything over 60 risks the ellipsis on desktop SERPs.
- Mobile shows ~70–80 chars but Google still indexes the full string — **optimize for the desktop cutoff**.
- Source: [Google title-link doc](https://developers.google.com/search/docs/appearance/title-link), [zyppy pixel research](https://zyppy.com/title-tags/meta-title-tag-length/).

### Brand placement

| Page type           | Brand placement                                              | Why                                                                          |
| ------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Homepage            | **Front** — "PixelDen Games — Free Pixel Art Browser Games" | The homepage IS the brand. First-word match for brand searches.              |
| Game detail page    | **Back** — "Play Snake Online Free — PixelDen Games"        | Long-tail / non-branded queries dominate. Keyword first wins click-throughs. |
| Blog post           | **Back** — "{Article title} — PixelDen Games"               | Same logic. The keyword is the hook.                                         |
| Category / `/games` | **Back** — "Free Browser Games — PixelDen Games"            | Generic head term first; brand reinforces.                                   |
| Player profile      | **Back** — "{nickname}'s Scores — PixelDen Games"           |                                                                              |

### Separator

- Use **`—` (em dash, U+2014)** or **`|` (pipe)** — both are visually clear and Google parses both. The repo currently uses `—`; **stay consistent** unless rewriting site-wide.
- Avoid `:` (looks like a sub-heading prefix), `›` (rarely renders well), `>` (HTML-escaping risk).

### Per-page-type templates

```
Homepage:        "PixelDen Games — Free Pixel Art Browser Games"
Games index:     "Free Browser Games — Play Pixel Art Games Online | PixelDen Games"
Game detail:     "Play {GameTitle} Online Free — {Genre} Pixel Art Game | PixelDen Games"
Game detail (alt): "{GameTitle} — Free Browser {Genre} Game | PixelDen Games"
Blog post:       "{Article title H1, ≤ 50 chars} — PixelDen Games"
Blog index:      "PixelDen Blog — Free Browser Games News & Guides"
Leaderboard:     "{Game} Leaderboard — Top Scores | PixelDen Games"
404:             "Page Not Found — PixelDen Games"
```

> The per-locale title comes from `locales/{en,de,es}/games/{slug}.json` (`seoTitle` field). Always provide all three.

### Title-tag don'ts

- ❌ Keyword stuffing: "Snake Game Free Play Snake Online Snake Browser Game Snake" — Google will rewrite the title and may demote.
- ❌ Identical titles across pages — every route must be unique. Google rewrites duplicates.
- ❌ Title that doesn't match H1 — mismatch is one of the top reasons Google rewrites your title ([Google docs](https://developers.google.com/search/docs/appearance/title-link)).
- ❌ Generic "Home", "Games", "Page" — too vague to rank.
- ❌ ALL CAPS — Google often lowercases or rewrites.

### Title tag does

- ✅ Primary keyword in the **first 30 characters** ("the hook never gets truncated").
- ✅ One brand mention; no `| BrandName | Marketing tagline | …` chains.
- ✅ Match `<title>`, `og:title`, `twitter:title`, and the visible `<h1>`. Drift → Google may rewrite ([Google title-link](https://developers.google.com/search/docs/appearance/title-link)).
- ✅ For seasonal / time-sensitive content add the year ("Best Free Browser Games 2026").

---

## §2 Meta descriptions

### Length

- **130–160 characters**. Below 120 looks padded by SERP rewrite; above 160 truncates on desktop.
- Google **rewrites 62–70 %** of meta descriptions ([Search Engine Land 2025](https://searchengineland.com/seo-meta-descriptions-everything-to-know-447910)). Don't obsess — but a good description still influences the 30–40 % that survive and click-through-rate when used.

### Structure (every description)

```
[Action verb / hook] + [primary keyword] + [unique value prop] + [CTA verb].
```

Examples:

```
✅  Play Snake online free — fast-paced pixel art classic, no download, instant browser play. Climb the leaderboard at PixelDen.   (155 chars)
✅  Drop colored crystals in this addictive falling-block puzzler. Free pixel art puzzle game, no install, plays in any browser.   (132 chars)
❌  PixelDen offers a variety of free games for everyone. Come check us out today and enjoy our many games on our website.        (generic / no keyword / no CTA)
❌  Snake. Free. Online. Play. Pixel. Browser. Game.                                                                              (keyword spam — Google will rewrite)
```

### Reduce rewrite rate

Google rewrites descriptions when:

- They're missing, generic, or boilerplate-identical across pages.
- They don't match what the query intent actually needs (Google pulls a passage from the body instead).
- They're stuffed with keywords or read like ad copy.

To keep your description: make it **a clean summary of the page's main answer** and ensure the **first paragraph of body content** echoes the same phrasing — Google often picks the body sentence over a stale meta.

### i18n

- Each locale has its own description (`locales/{en,de,es}/games/{slug}.json` field `seoDescription`).
- **Do not** machine-translate the description from English then leave it. The CTA verb ("Play" → "Spielen" → "Juega") and word order matter for the click.

---

## §3 Open Graph (og:*) tags

### Required (every page)

```html
<meta property="og:title"       content="...">                          <!-- = <title> minus the brand suffix often reads better -->
<meta property="og:type"        content="website">                       <!-- "article" for blog posts; "video.game" is NOT a real OG type -->
<meta property="og:image"       content="https://www.pixelden.io/...">   <!-- ABSOLUTE URL; never path-relative -->
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt"   content="Screenshot of Snake gameplay on PixelDen">
<meta property="og:url"         content="https://www.pixelden.io/games/snake">  <!-- = <link rel="canonical"> -->
<meta property="og:site_name"   content="PixelDen Games">
<meta property="og:description" content="...">                           <!-- 130-160 chars, can mirror meta description -->
<meta property="og:locale"      content="en_US">                         <!-- de_DE, es_ES per locale -->
```

### `og:image`

- **1200 × 630 px**, aspect ratio **1.91 : 1** — the universal "summary_large_image" + Facebook + LinkedIn safe size ([2026 spec roundup](https://www.krumzi.com/blog/open-graph-image-sizes-for-social-media-the-complete-2026-guide)).
- Keep key elements (text, faces) in the **center 1080 × 600 safe zone** — outer 60 px gets cropped on some platforms.
- File: **JPG or PNG, < 1 MB**. WebP works on most platforms but Facebook still has spotty WebP support — prefer PNG/JPG for `og:image` even though we use WebP elsewhere.
- **Absolute URL only**. Path-relative `og:image="/assets/og.png"` silently fails on every scraper.
- For game pages, use the **landscape promo art** if available, else fall back to the game thumbnail. Never use a square avatar — it gets letterboxed.
- Add `og:image:width` + `og:image:height` so scrapers (LinkedIn especially) don't have to fetch the file to decide whether to crop.

### Locale variants

```html
<meta property="og:locale"           content="en_US">
<meta property="og:locale:alternate" content="de_DE">
<meta property="og:locale:alternate" content="es_ES">
```

### `og:type` values to use

- `website` — homepage, game pages, catalog pages, profile pages (anything that's not a long-form article)
- `article` — blog posts (`/blog/$slug`)
- Custom `video.game` types exist in the spec but are **rarely respected** by major platforms; use `website` for game detail pages and let `VideoGame` JSON-LD carry the type signal.

### Don'ts

- ❌ `og:image` pointing to an SVG (Facebook will refuse it; Twitter strips it).
- ❌ `og:image` < 600 × 315 (no large card preview).
- ❌ Forgetting `og:url` — many scrapers use it as the canonical for share dedup.

---

## §4 Twitter / X Card tags

### Minimum required

```html
<meta name="twitter:card"        content="summary_large_image">
<meta name="twitter:title"       content="...">          <!-- ≤ 70 chars -->
<meta name="twitter:description" content="...">          <!-- ≤ 200 chars -->
<meta name="twitter:image"       content="https://www.pixelden.io/...">  <!-- 1200×675 ideal -->
<meta name="twitter:image:alt"   content="...">          <!-- 420 chars max -->
<meta name="twitter:site"        content="@PixelDenGames">
```

### What's different from OG

- Twitter **falls back to `og:*`** for title/description/image when `twitter:*` is missing — but **`twitter:card` itself is NOT inferred from OG**. Without it, no card renders ([2026 Twitter Card guide](https://ogmagic.dev/blog/twitter-card-image-guide)).
- Twitter's preferred image ratio is **2 : 1 (1200 × 600 or 1200 × 675)**. Our 1.91 : 1 OG image still works — gets minor side-crop. If we author a Twitter-specific image, prefer 1200 × 675.
- **Twitter's official Card Validator was retired**. To verify, post the URL into a Tweet draft and check the preview. Use [share-preview.com](https://share-preview.com) or similar third-party previewers for non-destructive testing.
- `twitter:image:alt` is part of Twitter's spec — include it for accessibility (screen readers on x.com use it). Max 420 chars.

### `twitter:site` vs `twitter:creator`

- `twitter:site` — the publisher's handle (us: `@PixelDenGames`). Always set on every page.
- `twitter:creator` — original author of the content. Set on blog posts if the author has a public handle; omit otherwise.

---

## §5 Structured data (Schema.org / JSON-LD)

### Universal rules

- **JSON-LD only.** Microdata and RDFa work, but Google's docs and tooling are JSON-LD-first; sites using JSON-LD report 23 % fewer SDTT errors ([JSON-LD vs Microdata comparison](https://www.searchenginejournal.com/ranking-keyword-domains/263693/)).
- Emit via React Router's `meta()` export using the `script:ld+json` key (already the pattern in this codebase — see `app/routes/($lang).games.$slug.tsx`).
- **Multiple JSON-LD blocks are fine** — one per `@type`. Don't try to cram everything into a single `@graph` unless you have a reason.
- **Validate with [Rich Results Test](https://search.google.com/test/rich-results)** before shipping any change to schema.

### Schema cheat sheet — what to add where

| Route                            | Schemas to emit                                                        |
| -------------------------------- | ---------------------------------------------------------------------- |
| `/` (homepage)                   | `WebSite` (+ `SearchAction`, see note), `Organization`, optional `ItemList` of featured games |
| `/games` (catalog)               | `BreadcrumbList`, `ItemList` of games                                  |
| `/games/$slug` (detail)          | `VideoGame` co-typed with `Game`, `BreadcrumbList`, optional `AggregateRating` if real plays/likes data |
| `/blog/$slug`                    | `BlogPosting` (with `author`, `datePublished`, `dateModified`, `image`, `headline`), `BreadcrumbList` |
| `/blog` (index)                  | `Blog` + `ItemList` of recent posts                                    |
| `/leaderboard`, `/players/$nick` | `BreadcrumbList` only                                                  |
| `/privacy`, `/safety`            | `BreadcrumbList` only (no special schema)                              |

### 5.1 `Organization`

Goes on the homepage (and optionally the root layout). Establishes brand identity for the Knowledge Graph.

```jsonc
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.pixelden.io/#organization",
  "name": "PixelDen Games",
  "alternateName": "PixelDen",
  "url": "https://www.pixelden.io",
  "logo": "https://www.pixelden.io/assets/logo-512.png",
  "sameAs": [
    "https://twitter.com/PixelDenGames",
    "https://www.linkedin.com/company/pixelden-games",
    "https://github.com/pixelden"
  ]
}
```

- **`sameAs`** is the single biggest signal for entity disambiguation. Each link to an authoritative external profile (Twitter, LinkedIn, GitHub, Wikidata, Crunchbase) is a "vote" telling Google "this entity = this site" ([entity SEO guide](https://www.olbuz.com/blog/what-is-entity-linking-seo)).
- Always use the same `@id` URL across pages so Google can stitch the graph together.
- `name` = the canonical brand. `alternateName` covers short forms. **Never** invent multiple `Organization` blocks with different names — confuses the graph.

### 5.2 `WebSite` + `SearchAction`

```jsonc
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.pixelden.io/#website",
  "url": "https://www.pixelden.io",
  "name": "PixelDen Games",
  "alternateName": "PixelDen",
  "publisher": { "@id": "https://www.pixelden.io/#organization" },
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.pixelden.io/games?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  },
  "inLanguage": ["en", "de", "es"]
}
```

> **Note (2024+):** Google retired the Sitelinks Search Box rich result on Nov 21, 2024 ([source](https://support.schemaapp.com/support/solutions/articles/33000241132-how-to-create-sitelinks-search-box-markup-)). Keeping `SearchAction` is still **recommended** for agentic / AI search engines that parse the same markup. Low cost, possible upside.

### 5.3 `VideoGame` (game detail pages)

Per Google's docs, **a VideoGame-only entry will not produce a rich result** — Google explicitly states: "Google doesn't show a rich result for Software Apps that only have the VideoGame type" ([SoftwareApplication docs](https://developers.google.com/search/docs/appearance/structured-data/software-app)). **Co-type** with `Game` (broader spec) to maximize eligibility:

```jsonc
{
  "@context": "https://schema.org",
  "@type": ["VideoGame", "Game"],
  "name": "Snake",
  "description": "Classic pixel art snake game...",
  "url": "https://www.pixelden.io/games/snake",
  "image": "https://www.pixelden.io/assets/games/snake/thumbnail.webp",
  "genre": "Arcade",
  "applicationCategory": "GameApplication",   // see valid values below
  "operatingSystem": "Web Browser",
  "gamePlatform": ["Web Browser", "HTML5"],
  "playMode": "SinglePlayer",                  // or MultiPlayer / CoOp
  "numberOfPlayers": { "@type": "QuantitativeValue", "value": 1 },
  "inLanguage": "en",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "publisher": { "@id": "https://www.pixelden.io/#organization" },
  "aggregateRating": {                         // ONLY if you have real plays + ratings
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "bestRating": "5",
    "worstRating": "1",
    "ratingCount": 1240                        // must be ≥ 1 real interaction
  }
}
```

#### `applicationCategory` — valid values

Use one of Google's 25 enumerated SoftwareApplication categories. For us, **`GameApplication`** is the only correct one. Do NOT use:
- `"Game"` (not a valid `applicationCategory`)
- `"Arcade"` (that's the `genre`)
- `"WebApplication"` (technically valid but misses the games signal)

#### `genre`

Free-text but **stick to common terms**: `Arcade`, `Puzzle`, `Strategy`, `Card`, `Action`, `Casual`, `Tower Defense`, `Roguelike`, `Platformer`. Capitalized, singular.

#### `aggregateRating` — when to include

- **Only when you have real review/play data**. Faking it violates Google's structured data guidelines and can trigger a manual action.
- The current registry-derived heuristic in `app/routes/($lang).games.$slug.tsx` (4 + leaderboard.length × 0.2, capped at 5) is a **placeholder**. It's tolerable while we have low play counts because the number isn't "made up out of nothing", but consider replacing with `likeCount`-based or omitting until real reviews exist.

### 5.4 `BreadcrumbList`

```jsonc
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home",  "item": "https://www.pixelden.io/" },
    { "@type": "ListItem", "position": 2, "name": "Games", "item": "https://www.pixelden.io/games" },
    { "@type": "ListItem", "position": 3, "name": "Snake", "item": "https://www.pixelden.io/games/snake" }
  ]
}
```

- **Minimum 2 ListItems** or Google ignores the markup.
- **`position` is 1-indexed**, contiguous.
- For the **last** item, `item` is optional per Google — but include it anyway, it never hurts.
- **Per-locale names**: use translated breadcrumb labels (`bcHome`, `bcGames` from `locales/.../meta.json`) — never English-only.
- **Note (Jan 2025):** Google removed breadcrumbs from **mobile** SERPs but kept them on desktop. The schema still matters because Google's crawlers use it for hierarchy inference even without visual rendering ([2025 update](https://www.fullstackoptimization.com/a/breadcrumbs-change-google-2025)).

### 5.5 `BlogPosting` / `Article` (blog posts)

```jsonc
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "New Free Browser Games — April 2026 Update",   // MATCH the visible H1, ≤ 110 chars
  "description": "Three new pixel art games hit PixelDen this month...",
  "image": [                                                   // ARRAY; provide multiple ratios if possible
    "https://www.pixelden.io/assets/blog/april-update-16x9.webp",
    "https://www.pixelden.io/assets/blog/april-update-4x3.webp",
    "https://www.pixelden.io/assets/blog/april-update-1x1.webp"
  ],
  "datePublished": "2026-04-12T09:00:00Z",
  "dateModified":  "2026-04-15T11:30:00Z",
  "author": {
    "@type": "Organization",
    "name": "PixelDen",
    "url": "https://www.pixelden.io"
  },
  "publisher": { "@id": "https://www.pixelden.io/#organization" },
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.pixelden.io/blog/april-2026-update"
  },
  "inLanguage": "en"
}
```

- **No required fields** per Google, but `headline`, `image`, `author`, `datePublished` are the recommended set and trigger rich results ([Google Article docs](https://developers.google.com/search/docs/appearance/structured-data/article)).
- `headline` ≤ 110 chars and **must visually match the page H1**.
- `image` minimum 696 px wide; provide an array with 16:9, 4:3, 1:1 ratios when feasible — Google picks the right one per surface.
- `dateModified` is a freshness signal Google reads in recency-sensitive queries. Update it whenever you make substantive edits, **not** on cosmetic ones (don't lie).
- `author.url` should be a real page about the author (we use `PixelDen` org-author since we don't have author profiles yet — fine).

### 5.6 `FAQPage` — **do not add**

**Status (2026):** FAQ rich results were narrowed to government/health sites in Aug 2023 and **fully removed** in May 2026 ([ALM Corp summary](https://almcorp.com/blog/google-faq-rich-results-no-longer-supported/), [Google's 2023 announcement](https://developers.google.com/search/blog/2023/08/howto-faq-changes)).

- **Do not** add `FAQPage` JSON-LD to new pages — it produces zero rich results and adds page weight.
- `HowTo` schema was also deprecated in the same wave — don't add it either.
- If existing pages have `FAQPage` markup, you can leave it (no penalty) or strip it during the next routine touch — Google ignores it gracefully.
- **Keep** writing FAQ-style content on blog posts (it still helps with People Also Ask + AI search visibility) — just don't wrap it in `FAQPage` schema.

### 5.7 `ItemList` (catalog pages)

For `/games` (catalog) and homepage featured grid:

```jsonc
{
  "@context": "https://schema.org",
  "@type": "ItemList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "item": {
        "@type": ["VideoGame", "Game"],
        "name": "Snake",
        "url": "https://www.pixelden.io/games/snake",
        "image": "https://www.pixelden.io/assets/games/snake/thumbnail.webp",
        "genre": "Arcade",
        "applicationCategory": "GameApplication",
        "operatingSystem": "Web Browser"
      }
    }
    // ... more items
  ]
}
```

Best practice: include **all games in the catalog ItemList**, not a paginated subset — Google appreciates the complete inventory signal and it helps internal-link discovery.

---

## §6 Canonical URLs

### Rules

1. **Every indexable page must have one** `<link rel="canonical">`.
2. **Use absolute URLs**. `<link rel="canonical" href="/games/snake">` is silently invalid in Google's eyes ([Google docs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)).
3. **Self-referencing is the default and correct behavior.** A page's canonical pointing to itself is what you want 95 % of the time. If a canonical points away, you're telling Google "this page doesn't deserve to rank" — only do that for true duplicates.
4. **Canonical must agree with hreflang.** If a German page's canonical points to the English version, all the German hreflang annotations are invalidated — Google picks one and it's almost always the canonical, not the hreflang (see [§7](#§7-hreflang-international-seo) and [SEO Logist write-up](https://www.seologist.com/knowledge-sharing/canonical-hreflang/)).
5. **Canonical must agree with the rendered locale.** A request to `/de/games/snake` must canonical to `https://www.pixelden.io/de/games/snake`, not the English root.
6. **Match `og:url`** — they should be the same absolute URL. Mismatches confuse share-link dedup on Facebook/LinkedIn.

### When NOT to set canonical

Almost never. The two exceptions:

- A duplicate page that legitimately consolidates to another (e.g. a `?utm=` campaign URL → bare URL; React Router params usually handle this via redirect, not canonical).
- A syndicated copy of someone else's content. (We don't syndicate, so N/A.)

### Common mistakes

- ❌ Canonical to the **wrong host** (`pixelden.io` vs `www.pixelden.io`). We use `www` — be consistent.
- ❌ Canonical includes a **fragment** (`#section`) — Google strips fragments from URLs anyway; including one looks broken.
- ❌ **Conflicting canonicals**: setting one via `<link>` and another via `Link:` HTTP header — pick one method.
- ❌ Trailing-slash mismatch: `https://www.pixelden.io/games` vs `/games/` — decide the site convention and stick to it. (This repo: **no trailing slash**.)
- ❌ Canonicaling a paginated page `?page=2` back to `?page=1` — Google guidance changed; let each pagination page self-canonical.

---

## §7 Hreflang (international SEO)

### Format

```html
<link rel="alternate" hreflang="en"        href="https://www.pixelden.io/games/snake">
<link rel="alternate" hreflang="de"        href="https://www.pixelden.io/de/games/snake">
<link rel="alternate" hreflang="es"        href="https://www.pixelden.io/es/games/snake">
<link rel="alternate" hreflang="x-default" href="https://www.pixelden.io/games/snake">
```

The repo already produces this via `app/lib/hreflang.ts` — **always use that helper**, never hand-roll. New routes should call `hreflangLinkDescriptors(baseUrl, path)` in their `meta()` export.

### Rules

1. **Reciprocal links**: every locale alternate must include itself AND every other locale (including itself). Google's hard rule: "If page X links to page Y, page Y must link back to page X" ([Google hreflang docs](https://developers.google.com/search/docs/specialty/international/localized-versions)).
2. **`x-default`** points to the locale a user sees when no language preference matches. We use **English** (en-only, no region) as the default — same target as the bare path.
3. **Use ISO 639-1 language codes only** (`en`, `de`, `es`) — **not** `en-US`, `de-DE`, `es-ES` — unless we actually serve country variants. We currently serve one variant per language → language-only codes.
4. **Common pitfalls**:
   - `uk` (Ukrainian) ≠ `ua`. `EN-UK` is invalid; for British English use `en-GB`.
   - Missing self-reference — every alternate set must include the current page.
   - Hreflang pointing to a URL that 404s or returns `noindex` — Google drops the cluster.
5. **Don't put hreflang on a `noindex` page.** The page is excluded from indexing, the annotation is wasted.
6. **Canonical must agree with hreflang** (see [§6](#§6-canonical-urls)).

### Sitemap alternative

If hreflang ever exceeds practical inline emission (many locales, many pages), move it to the XML sitemap (`app/routes/sitemap[.]xml.tsx`) via the `xhtml:link` extension. Currently inline `<link>` is fine for 3 locales.

---

## §8 Brand entity differentiation (the "is this PixelDen?" problem)

PixelDen Games competes with:
- **pixeden.com** — premium graphics/UI assets brand (similar string, totally unrelated)
- **@the_pixelden** — Twitter pixel artist (similar handle)
- generic strings like "pixel den" / "the pixel den"

This is a classic **entity disambiguation** problem. The fix is structural, not copywriting.

### Required brand patterns

1. **Always use `PixelDen Games` as the full canonical name** in:
   - `<title>` brand suffix
   - `og:site_name`
   - `Organization.name`
   - `WebSite.name`
   - `publisher.name` in BlogPosting/VideoGame
   - First mention in body content of any page

2. **`alternateName: "PixelDen"`** on the `Organization` + `WebSite` schemas — covers conversational short-form without losing the canonical.

3. **`@id`-anchored Organization** — every other schema (`BlogPosting`, `VideoGame`) references the org with `"publisher": { "@id": "https://www.pixelden.io/#organization" }` instead of duplicating the org block. This is what lets Google build a single entity graph.

4. **`sameAs` array on `Organization`** — link out to every official profile (Twitter, GitHub, LinkedIn, Wikidata if/when we have a page). Each link = one disambiguation vote ([entity SEO guide](https://www.olbuz.com/blog/what-is-entity-linking-seo)).

5. **Optional but valuable: `disambiguatingDescription`**:
   ```jsonc
   "disambiguatingDescription": "PixelDen Games is a free HTML5 pixel art browser games portal at pixelden.io, not affiliated with pixeden.com (UI assets) or any individual pixel artist."
   ```
   Add to the homepage Organization block. Helps LLMs (ChatGPT/Perplexity) disambiguate when summarizing.

### Naming hygiene

- ❌ Lowercase "pixelden games" or "pixel den" in body copy — looks like a different entity to crawlers.
- ❌ Variant capitalizations across pages ("PixelDen", "Pixelden", "PIXELDEN") — pick one and lint for it.
- ✅ In casual prose, "PixelDen" alone is fine (matches `alternateName`).
- ✅ First brand mention in any new article/page should be the full "PixelDen Games" form, subsequent mentions can be "PixelDen".

### When adding qualifier words helps

- Helps: brand + product noun. "PixelDen Games" disambiguates from "pixelden" (asset site).
- Helps: brand + city/region for local entities (N/A for us, global brand).
- Hurts: brand + every keyword. "PixelDen Games Free Online Browser HTML5 Pixel Art Game Portal" reads as keyword spam and dilutes the entity signal.

---

## §9 Image SEO (the parts that move SEO, not just a11y)

### Alt text

- **Descriptive, ≤ 100 chars**. "Screenshot of Snake gameplay showing the snake about to eat an apple" beats "snake.png" and beats "Snake game".
- **Empty alt + `aria-hidden="true"`** for purely decorative images (background patterns, icon dividers): `<img src="..." alt="" aria-hidden="true">`.
- **Don't keyword-stuff alt**. One natural mention of the relevant keyword is plenty.
- **Game thumbnails**: alt should be "{GameTitle} game thumbnail" or describe what's pictured, not just the game name twice.

### Above-the-fold / LCP image

- **Always `<img>`**, never `background-image` CSS — Phaser canvas excluded. This is the most common LCP killer we hit ([see lighthouse skill](../lighthouse/SKILL.md)).
- Set explicit `width` and `height` attributes (prevents CLS).
- Set `fetchPriority="high"` on the single LCP image; **don't** set it on multiple images per page (priority signal gets diluted).
- Set `loading="eager"` (the default for in-viewport images; setting `loading="lazy"` on the LCP image is a documented anti-pattern).
- Provide `srcset` for responsive sources.

### File format

- WebP by default for content images (already the repo convention; see `LazyImage` component).
- AVIF where Phaser/Phaser assets allow — better compression, supported by all current browsers.
- **OG images** are the exception — JPG/PNG for max Facebook/LinkedIn compatibility (see [§3](#§3-open-graph-og-tags)).

### Caching gotcha

Public assets (`public/assets/**`) are **not** Vite-fingerprinted but our nginx config sets `Cache-Control: immutable, max-age=31536000`. If you replace `public/assets/games/snake/thumbnail.webp` in place, browsers and the OG-scraper cache will keep serving the old image for a year. **Always bump the filename** (`thumbnail-v2.webp`) when content changes. (See the `nginx-static-cache` feedback memory.)

---

## §10 Core Web Vitals — the SEO-relevant view

CWV is a confirmed ranking signal (since June 2021) and a **tiebreaker** in competitive niches. All three must pass at the 75th percentile of real-user data for the page to be flagged "good" in Search Console ([Google docs](https://developers.google.com/search/docs/appearance/core-web-vitals)).

| Vital  | Threshold (good) | What to optimize first                                                       |
| ------ | ---------------- | ---------------------------------------------------------------------------- |
| LCP    | ≤ 2.5 s          | Hero image as `<img>` (not CSS bg), `fetchPriority="high"`, preload, no late-loaded webfont blocking |
| INP    | ≤ 200 ms         | Reduce main-thread JS work; avoid heavy click handlers; defer non-critical scripts; chunk long tasks |
| CLS    | ≤ 0.1            | `width`/`height` on every `<img>`, reserved ad slot dimensions, no late-inserted DOM above current scroll position |

- **INP replaced FID in March 2024.** Old "FID < 100ms" advice is obsolete ([web.dev](https://web.dev/articles/vitals)).
- **43 % of sites fail INP in 2026** — the most-failed metric. For us that means: every `lucide-react` icon, every analytics handler, every Sentry init has to be audited for main-thread cost.
- Use the `lighthouse` skill (`task lighthouse`) for local audits. Dev numbers are not prod numbers (rule of thumb: prod LCP ≈ dev LCP × 0.5).
- For real-world prod numbers post-deploy, use `mcp__metrifyr__psi_analyze` against the public URL.

### CWV + SEO: the realistic story

Content relevance is still the #1 ranking factor. CWV is a tiebreaker. But:

- Pages that fail CWV have measurably **higher bounce rates** (24 % higher per [CWV 2026 stats](https://www.corewebvitals.io/core-web-vitals)) — that's a user-behavior signal Google does measure indirectly.
- AI search engines (ChatGPT/Perplexity browse mode) timeout slow pages — failed CWV often = zero citation opportunity.
- A CWV regression won't tank a strong page, but it will sap headroom in competitive SERPs.

---

## §11 Anti-patterns (what NOT to do in 2026)

### 11.1 Schema spam

- ❌ Don't add `FAQPage` to product/game pages — Google ignores it (deprecated 2026) and at one point penalized abuse.
- ❌ Don't add fake `aggregateRating` — Google can detect synthetic ratings and issues manual actions.
- ❌ Don't add `Review` to your own products written by yourself — must be user-generated.
- ❌ Don't co-type with random types ("VideoGame + Movie") to grab multiple rich result chances.

### 11.2 Meta tags that no longer matter

- ❌ `<meta name="keywords">` — ignored by every major search engine since ~2009. **Delete on sight.**
- ❌ `<meta name="revisit-after">` — never honored.
- ❌ `<meta name="distribution">` — never honored.
- ❌ `<meta name="generator">` — informational only, no SEO effect.

### 11.3 Anchor text

- ❌ Exact-match anchor stuffing across internal links ("free snake game", "free snake game", "free snake game" everywhere). Vary anchors; use descriptive prose.
- ❌ "click here" / "read more" — adds nothing to internal-link semantics.
- ✅ Descriptive: "play Snake free in your browser" linking to `/games/snake`.

### 11.4 Content

- ❌ AI-generated boilerplate with no value-add ("Snake is a fun game. Play Snake today. Snake is great."). Google's helpful-content + spam updates target this directly.
- ❌ Same description across all locales (machine translation that hasn't been reviewed). Per-locale `seoDescription` should read natively.
- ❌ Pages with `noindex` in the original HTML when you DO want them indexed. Google's Dec 2024 update made it explicit: noindex in JS may cause Googlebot to skip rendering ([source](https://almcorp.com/blog/google-noindex-tag-warning-original-page-code/)).
- ❌ Duplicate content across `/`, `/en/`, `/games`, `/en/games` — make sure the redirect-or-canonical strategy is consistent.

### 11.5 Robots / indexing

- ❌ `robots.txt` `Disallow:` + `<meta name="robots" content="noindex">` on the same URL. Google can't read the noindex because it can't crawl. Page stays indexed.
- ❌ `noindex, nofollow` on a page Google should follow links from. Prefer `noindex, follow` so link equity flows.
- ❌ Putting `noindex` on the page during a deploy and forgetting to remove it. Add a smoke test.

### 11.6 Misc

- ❌ Setting `og:image` to a path-relative URL (`/og.png`). Scrapers see nothing.
- ❌ Stuffing brand into every URL slug: `/games/pixelden-games-snake`. Just `/games/snake`.
- ❌ Hidden text for SEO ("display:none" content with keywords) — well-known spam pattern.

---

## §12 PixelDen-specific patterns

### Where SEO code lives

| Concern              | File                                                              |
| -------------------- | ----------------------------------------------------------------- |
| Homepage SEO         | `app/routes/($lang)._index.tsx` — `meta()` export                 |
| Game catalog         | `app/routes/($lang).games._index.tsx`                             |
| Game detail          | `app/routes/($lang).games.$slug.tsx` — currently the gold-standard reference for VideoGame + Breadcrumb + hreflang |
| Blog list            | `app/routes/blog._index.tsx`                                      |
| Blog post            | `app/routes/blog.$slug.tsx`                                       |
| Hreflang helper      | `app/lib/hreflang.ts` — **always use** `hreflangLinkDescriptors()` |
| Canonical base URL   | `app/lib/canonical.server.ts` — `getBaseUrl()`                    |
| Locale resolution    | `app/lib/locale.server.ts` — `resolveLocaleFromPathname()`, `resolveLocale()` |
| i18n strings (SEO)   | `locales/{en,de,es}/{namespace}.json` — `seoTitle`, `seoDescription`, `metaStrings.*` |
| Game registry        | `app/games/registry.ts` — `genre`, `seoTitle`, `seoDescription`, `longDescription`, `thumbnailUrl` |
| Sitemap              | `app/routes/sitemap[.]xml.tsx`                                    |
| `llms.txt`           | `app/routes/llms[.]txt.tsx`                                       |
| Root meta/viewport   | `app/root.tsx`                                                    |

### `meta()` export shape (React Router v7)

```ts
export function meta({ data }: Route.MetaArgs) {
  // 1. Resolve locale + base URL
  const baseUrl = data?.baseUrl ?? "https://www.pixelden.io";
  const locale  = (data?.locale ?? "en") as Locale;
  const canonical = `${baseUrl}${getLocalePath(locale, "/path")}`;

  // 2. Build title + description (prefer per-locale strings from loader)
  const title = data?.seoTitle ?? "Fallback Title — PixelDen Games";
  const desc  = data?.seoDescription ?? "Fallback description...";

  // 3. Build absolute og:image URL
  const ogImage = "https://www.pixelden.io/assets/og-default.png";

  // 4. Return the descriptor array
  return [
    { title },
    { name: "description",   content: desc },
    { tagName: "link", rel: "canonical", href: canonical },
    { property: "og:title",        content: title },
    { property: "og:description",  content: desc },
    { property: "og:image",        content: ogImage },
    { property: "og:image:width",  content: "1200" },
    { property: "og:image:height", content: "630" },
    { property: "og:url",          content: canonical },
    { property: "og:site_name",    content: "PixelDen Games" },
    { property: "og:type",         content: "website" },
    { property: "og:locale",       content: locale === "de" ? "de_DE" : locale === "es" ? "es_ES" : "en_US" },
    { name: "twitter:card",        content: "summary_large_image" },
    { name: "twitter:site",        content: "@PixelDenGames" },
    { name: "twitter:title",       content: title },
    { name: "twitter:description", content: desc },
    { name: "twitter:image",       content: ogImage },
    { "script:ld+json": { /* schema here */ } },
    ...hreflangLinkDescriptors(baseUrl, "/path"),
  ];
}
```

### Loader pattern for SEO data

SEO strings come from the **loader**, not hardcoded in the component:

```ts
export async function loader({ request, params }: Route.LoaderArgs) {
  const baseUrl = getBaseUrl();
  const locale  = resolveLocale(request, await getUser(request));
  const canonicalLocale = resolveLocaleFromPathname(new URL(request.url).pathname);

  // Load per-locale SEO strings
  const seoTitle = await getTranslationString(locale, "games", `${params.slug}.seoTitle`);
  // ... etc

  return { baseUrl, locale, canonicalLocale, seoTitle, /* ... */ };
}
```

### i18n SEO strings — file layout

```
locales/
  en/
    games/snake.json      # { title, description, seoTitle, seoDescription, longDescription, howToPlay, ... }
    games/_index.json     # catalog page meta
    meta.json             # global meta strings (breadcrumb labels, fallbacks)
  de/  ... same shape
  es/  ... same shape
```

**Rules:**
- Every game JSON must have `seoTitle` and `seoDescription` for every locale before the route ships.
- `seoTitle` ≤ 60 chars; `seoDescription` 130–160 chars (validate manually).
- Don't deep-translate brand names ("PixelDen Games" stays in all locales).

### Brand string lint

The canonical brand is **`PixelDen Games`** (with `PixelDen` as a valid short form). When auditing existing pages, grep for variations:

```bash
grep -rn -i "pixel den\|pixel-den\|pixelden games" app/ locales/ content/  | grep -v "PixelDen Games\|PixelDen\""
```

If you find lowercase / variant spellings in user-facing strings, normalize them.

---

## §13 HTML5 games portal — what works (PixelDen-specific SEO playbook)

### Search intent by route

| Route                  | Likely query intent                                              | Strategy                                                                                  |
| ---------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `/`                    | Branded ("pixelden", "pixelden games")                           | Brand front-loaded title; full Organization + WebSite schema; sitelinks-ready layout (H2 sections matching key pages) |
| `/games`               | Generic head ("free browser games", "html5 games")               | Keyword-rich title; ItemList of all games; pillar-page content above the grid             |
| `/games/$slug`         | Long-tail ("play {game} online free", "{game} game browser")     | "Play {Game} Online Free" title; VideoGame schema co-typed with Game; first 100 words = direct answer |
| `/blog/$slug`          | Informational ("best free puzzle games 2026", "how to play …")   | Article schema; H2-rich; internal links to game pages; FAQ-style sections (no FAQ schema) |
| `/players/$nickname`   | Branded long-tail / user-driven                                  | Profile-style title; minimal schema (`Person` optional); `noindex` if profile is private  |

### Long-tail patterns that actually convert for game portals

- **"play X online free"** — the highest-converting pattern. Title: `Play Snake Online Free — Pixel Art Arcade Game`. Body opens with "Play Snake online free in your browser, no download required."
- **"X game browser no download"** — title can lead with the genre: `Free Snake Game — Play Online in Browser, No Download`.
- **"best {genre} browser games 2026"** — blog pillar pages, not game detail. Update `dateModified` annually.
- **"{game} controls" / "how to play {game}"** — instructional sections WITHIN the game page (anchor links #controls, #how-to-play). Don't make separate pages — splits link equity.

### Aggregator vs indie portal

PixelDen is a **first-party indie portal** (we made the games), not an aggregator. That changes the SEO posture:

- **Stronger entity claim** — we can credibly say "PixelDen made Snake (a pixel art reimagining)" in copy. Aggregators can't. Use this in body content to differentiate from CrazyGames/Poki.
- **Game `publisher` is us**, not a 3rd party — important for VideoGame schema authenticity.
- **Lower play counts** means `aggregateRating` should be deferred until real volume; faking it is more visible at small scale.
- **Unique-art moat** — every game thumbnail is original pixel art. Use that in `og:image` and `alt` text descriptors ("original pixel art of...") for differentiation.

### Internal linking patterns

- Every game page links to **3+ related games** (already done via `RelatedGamesGrid`) — keep that on every new game route.
- Every blog post links to **at least 2 game pages** on first mention.
- Catalog `/games` links to every game; homepage features ~6–10.
- Footer has links to `/games`, `/blog`, `/leaderboard`, `/privacy`, `/safety` — keeps PageRank flowing to deep pages.

### AI search (ChatGPT / Perplexity / Google AI Overviews)

These engines pull from the same content but with different weightings:

- **Perplexity** — heaviest on citation density + recency. Update `dateModified` honestly when content meaningfully changes; add inline citations in blog posts where claims can be sourced.
- **ChatGPT** — favors **answer-first structure + domain authority**. First sentence of every page should be the direct answer.
- **Google AI Overviews** — leans on what already ranks in classic Google. Optimize for classic SEO, AI Overviews follow.

The repo already has `app/routes/llms[.]txt.tsx` — keep it pointing to canonical game pages and the blog index. Add new top-priority pages when they ship.

---

## §14 Audit checklist (use when reviewing an existing route)

Run through this before declaring a page "SEO done":

- [ ] `<title>` is unique, ≤ 60 chars, primary keyword in first 30 chars, brand at correct end (homepage front, others back)
- [ ] `<meta description>` is unique, 130–160 chars, includes CTA verb
- [ ] All four image-share tags resolve to absolute URLs (`og:image`, `og:url`, `twitter:image`, canonical)
- [ ] `og:url` === canonical === current URL with correct locale prefix
- [ ] `og:image` is 1200×630 JPG/PNG (not SVG, not WebP) and < 1 MB
- [ ] `twitter:card` is explicitly set (not relying on OG fallback)
- [ ] JSON-LD validates in [Rich Results Test](https://search.google.com/test/rich-results) with **zero errors** (warnings OK)
- [ ] `BreadcrumbList` has ≥ 2 items, contiguous `position`, per-locale `name`
- [ ] `VideoGame` is co-typed with `Game`, has `applicationCategory: "GameApplication"`
- [ ] Hreflang emits all three locales + `x-default`, all absolute URLs, self-referential included
- [ ] Canonical doesn't conflict with hreflang
- [ ] Brand string is `PixelDen Games` everywhere structured (titles, og:site_name, schema)
- [ ] No `FAQPage` / `HowTo` schema (deprecated)
- [ ] No `<meta name="keywords">` (dead)
- [ ] All `<img>` have `alt` or `aria-hidden="true"`
- [ ] LCP image is `<img>` with `width`/`height`/`fetchPriority="high"`
- [ ] No accidental `noindex` left in source
- [ ] Page passes Lighthouse SEO category (≥ 95) — run `task lighthouse`

---

## §15 Quick references (cite these in PRs / commits when defending a choice)

**Google Search Central (authoritative):**

- [Title link best practices](https://developers.google.com/search/docs/appearance/title-link)
- [Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [BreadcrumbList structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)
- [SoftwareApplication / VideoGame](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Localized versions (hreflang)](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Consolidate duplicate URLs (canonical)](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Block indexing (noindex)](https://developers.google.com/search/docs/crawling-indexing/block-indexing)
- [Robots meta tag spec](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)
- [Understanding Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Search Gallery (all rich result types)](https://developers.google.com/search/docs/appearance/structured-data/search-gallery)
- [FAQ rich results change (Aug 2023)](https://developers.google.com/search/blog/2023/08/howto-faq-changes)

**Schema.org (canonical type definitions):**

- [VideoGame type](https://schema.org/VideoGame)
- [WebSite type](https://schema.org/WebSite)
- [SearchAction type](https://schema.org/SearchAction)
- [Organization type](https://schema.org/Organization)
- [BreadcrumbList type](https://schema.org/BreadcrumbList)

**Web.dev (performance + CWV):**

- [Core Web Vitals overview](https://web.dev/articles/vitals)

**Validators / tools:**

- [Rich Results Test](https://search.google.com/test/rich-results) — primary structured data validator
- [Schema Markup Validator](https://validator.schema.org/) — full schema.org validator (Google's RRT only covers Google-supported subset)
- [share-preview.com](https://share-preview.com) — OG / Twitter Card preview (since X retired theirs)
- Facebook Sharing Debugger — `https://developers.facebook.com/tools/debug/`
- [Google Search Console](https://search.google.com/search-console) — coverage, CWV, hreflang errors
- `task lighthouse` — local CWV audit (this repo)

---

## §16 When in doubt

1. **Check this skill first.** If it's not covered, check the Google Search Central docs in §15.
2. **Default conservative.** If a rich-result type isn't on this skill's allowlist, don't add it. Schema bloat has cost (page weight, validation noise) and no upside.
3. **Run [Rich Results Test](https://search.google.com/test/rich-results)** on the deployed URL before declaring a structured-data change done. Local dev has noindex headers, won't match prod parsing.
4. **For 1-off ambiguous questions** about meta/schema, prefer mirroring an existing PixelDen route that already has the pattern (game detail page is the most complete reference today).
5. **Don't optimize for what Google "might" reward.** Optimize for what Google's docs explicitly reward today. Reverse-engineering rumored signals (entity sentiment, "topical authority scores") burns time for no measurable lift.
