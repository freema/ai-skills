---
name: seo-blog
description: "Write player-focused, SEO-optimized blog posts for PixelDen. Use for any new article in content/blog/. Hard rule: NO technical/devlog content (no tech stack, code, internals, file paths, framework names). Audience is players, not developers."
---

# PixelDen SEO Blog Writing

Write blog posts that rank in Google + AI search engines (ChatGPT, Perplexity, Gemini) AND make players want to click "Play Now". Every article is content marketing for the games — never a changelog.

## The #1 Rule: No Technical Content

PixelDen blog readers are **players**, not developers. Banned from articles:

- Tech stack names (Phaser, React Router, Vite, TypeScript, Drizzle, Redis, Docker)
- Code snippets, file paths (`app/games/...`), variable names, function names
- Internal architecture (FSMs, scenes, registries, helpers, hooks)
- Numbers that only matter to engineers (canvas dimensions like "960×720", physics tick rates, sub-frame counts)
- Commit messages, version numbers, refactor descriptions
- "Under the hood", "infrastructure", "wired up", "opt-in", "helper"

If a sentence would only make sense to someone who has read the codebase, **delete it**.

What players DO care about:

- What the game feels like to play
- What's new they can try right now
- The fantasy / mood / setting of the game
- Concrete play tips (controls, win conditions, strategy)
- Languages they can play in, devices that work

## Required Structure

Every post follows this skeleton:

```
1. Direct answer (1-2 sentences) — what's the news, in the first lines
2. TL;DR / Key Takeaways block — 3-5 bullets
3. 4-7 H2 sections covering the announcement + games
4. FAQ section (4-6 natural-prompt questions)
5. Conclusion with CTA to play
```

### Direct-Answer-First (AI search optimization)

The very first 1-2 sentences must directly answer the implied query. AI scrapers pull from the top of the article — bury the answer behind a narrative hook and you lose the citation.

✅ "PixelDen now offers two new free browser games — Edge Claim and Dead Man's Hand — plus full Spanish and German support across the entire portal."

❌ "It's been a busy month at PixelDen. We've been working hard on a number of exciting new things..."

### TL;DR Block

Place after the intro paragraph, before the first H2:

```markdown
> **Key Takeaways**
>
> - [Specific claim with concrete detail #1]
> - [Specific claim with concrete detail #2]
> - [Specific claim with concrete detail #3]
> - [Specific claim with concrete detail #4]
```

Each bullet must be a complete claim, not a teaser. Specific numbers, names, outcomes.

### H2 Sections

- 4-7 H2 sections per article
- 2-3 of them include keyword variations
- One idea per H2 (AI parses content per section)
- Player-focused: "How to play", "What makes it fun", "Best for", not "Technical implementation"

### FAQ Section (mandatory)

- 4-6 questions in natural prompt language ("How do I play X?", "Is X free?", "Can I play X on my phone?")
- Answer the first sentence directly, then expand 2-3 sentences
- These target Google's People Also Ask AND match how players prompt ChatGPT

## Word Count

- News / update posts: **800-1,200 words** (the typical PixelDen post)
- New game launch deep-dive: **1,500-2,500 words**
- Pillar guides ("Best free browser games 2026"): **2,000-3,000 words**

Do NOT pad to hit a count. Better 900 strong words than 1,500 padded.

## Frontmatter Template

```yaml
---
title: "[Primary keyword] — [Benefit/Hook]" # 50-60 chars
slug: kebab-case-with-primary-keyword
excerpt: "[150-160 chars, directly answers the query, ends with CTA verb]"
imageUrl: /assets/blog/[descriptive-keyword-name].webp # OR a game thumbnail
author: PixelDen
tags:
  - news
  - [game-slug or topic]
publishedAt: YYYY-MM-DDTHH:MM:SS.000Z
isPublished: true
---
```

### Title rules

- 50-60 characters
- Primary keyword near the start
- Year for time-sensitive titles ("New Free Browser Games — April 2026")
- Benefit/hook, not just a feature name

### Slug rules

- Lowercase, hyphens
- 3-5 words including primary keyword
- No stop words unless needed

### Excerpt / meta description

- 150-160 chars exactly
- Includes primary keyword
- Ends with a CTA verb (Play, Try, Discover, Start)
- Stands alone — must answer the search query without the article

## Keyword Strategy

### Primary keyword candidates for PixelDen

- "free browser games"
- "free pixel art games"
- "play [game name] online"
- "browser games no download"
- "free [genre] games online" (blackjack, arcade, puzzle, strategy, card)

### Density

- Primary keyword: 1-2% (a 1000-word post = 10-20 mentions)
- Use natural variations, not robotic repetition
- Must appear in: H1, first 100 words, 2-3 H2s, conclusion, slug, meta title, meta description

### LSI / semantic keywords

For PixelDen articles, naturally weave in: pixel art, retro, arcade, online, free to play, no download, browser game, play instantly, leaderboard, mobile-friendly.

## Internal Linking

- Minimum **3 internal links** per article
- Game pages: `/games/[slug]` — always use the canonical slug
- Other blog posts: `/blog/[slug]`
- Catalog: `/games`
- Anchor text must be descriptive ("play Edge Claim free", not "click here")
- Distribute throughout — never cluster

When announcing new games, every game mention in the body should link to its page on first reference.

## Forbidden Phrases (from past corrections)

These appeared in earlier drafts and were rejected:

- "Under the hood"
- "Wired up", "wired through"
- "Helper", "infrastructure", "pipeline"
- "Opt-in", "additive"
- "Per-device viewport", "scale manager", "FSM"
- Anything with code-style file paths or backticks around technical terms
- "We refactored", "we extracted", "we extended"

If you catch yourself writing these, stop and rewrite the sentence from a player's POV.

## Tone

- Direct, energetic, second person ("you")
- Show, don't list features ("slice the grid and fence off bigger chunks than the AI" beats "fast-paced gameplay")
- Concrete sensory details (the felt table, the neon grid, the cheating boss's tells)
- Czech user, but **UI and blog copy are English-only**

## Pre-Publish Checklist

Before saving:

- [ ] First 1-2 sentences directly answer the implied query
- [ ] TL;DR / Key Takeaways block after the intro
- [ ] No technical terms, file paths, or framework names anywhere
- [ ] 4-7 H2 sections, 2-3 with keyword variations
- [ ] FAQ section with 4-6 natural-prompt questions
- [ ] Primary keyword in H1, first 100 words, 2-3 H2s, conclusion
- [ ] Meta title 50-60 chars with keyword
- [ ] Excerpt 150-160 chars, answers the query, has CTA
- [ ] Slug includes primary keyword
- [ ] 3+ internal links, descriptive anchor text
- [ ] Word count appropriate (news 800-1,200; launch 1,500-2,500)
- [ ] Every game mention links to `/games/[slug]` on first reference
- [ ] Reads like a player wrote it for other players

## Process for `/seo-blog` Command

When invoked via `/seo-blog [topic]`:

1. **Confirm the topic** with the user if ambiguous (which games, which features, what release)
2. **Identify primary keyword** — propose 1-2 candidates and confirm
3. **Read git log + relevant game registry entries** for facts (genre, controls, mode, languages)
4. **Read existing blog posts** in `content/blog/` to match tone and avoid duplication
5. **Draft following this skill's structure**
6. **Run the pre-publish checklist** before saving
7. **Save to** `content/blog/[slug].md`
8. **Report** word count, primary keyword density estimate, and where the article links to
