# Redesign spec — template

One markdown file in the repo (e.g. `tasks/NNN-mobile-first-redesign.md`).
Agents read it first; the orchestrator keeps it current after every PR.
Chapter numbers matter: briefs cite them ("build chapter 4.2, tokens from 6").

```markdown
# NNN — Mobile-first redesign (vX.Y.0)

Status: <planned | in progress (PR n of m) | released as vX.Y.0 on YYYY-MM-DD>

## 0. Start here
- What to build, in three sentences.
- Reading order: this file → prototype → phone study → inventory.
- Repo rules in short (task runner, formatting, i18n check, links that must
  hard-reload, selectors tests depend on, "never merge without the owner").
- How to run it: dev server, production build + local preview, gates.
- Done means, per PR: gates green; verified on a real phone on a production
  build; PR body = what / why / metric / baseline / phone screenshots before
  and after; server-HTML text kept (chapter 11); desktop at 1440 not broken.
- Done means, for the release: every row of chapter 2 met on the phone, every
  route converted, the old look and the switch removed, owner said "release".

## 1. Owner decisions (date)
Numbered list: scope, the model to follow (principles only, no copying),
what must not change, ads/consent policy, who implements.

## 2. Targets and baseline
| Measurement | Today | Leader | Target | Result PR n |
Rows: whole items on first screen; top edge of first item (home, listing,
category); page height of the longest listing; smallest text; contrast of text
up to 18 px; smallest tap target; taps to core action; time to usable; LCP and
CLS of home and entity page; key text present in server HTML.
Conditions line: phone class, browser version, viewport, DPR, build, network.

### Traffic baseline (28 days before release)
| Metric | Desktop | Mobile |
Users, sessions, engaged sessions, avg. session, pages/session, core-action
events, share of users who did the core action, search clicks, impressions,
CTR; position overall. Goal metrics and guard metrics named here.

## 3. Design principles
What we take as a principle (dense grid, one big action button, text lower),
what is ours (identity, colours, type), what we deliberately do not do.

## 4. Screens
4.1 Home, 4.2 Entity page, 4.3 Listings, 4.4 Search, 4.5 Navigation,
4.6 Installed-app mode — order of blocks from the top, with the route file.

## 5. Components
| Component | What it does | + rules (image sizes, srcset, priority on the
first item only, lazy below the fold, title as HTML text).

## 6. Tokens, type, sizes
| Token | Value | Use | Contrast |
Type roles (page title, entity title, home title, section, subsection, card
title) phone / desktop. Minimum sizes. Spacing and radii. "Replace hard-coded
values file by file; old utilities stay until the old look is deleted."

## 7. Data model changes (all optional fields, so nothing has to change at once)

## 8. Identity assets (icons, art)
Spec (sizes, exports, format, weight, safe zone, no text), file names with
versions, production method, trial batch first, results with weights.

## 9. Preview media (if any): spec, where it plays, one at a time, reduced motion

## 10. Reserved slots (ads etc.): named positions, off by config, reserved height

## 11. Search engine rules
Nothing deleted; collapsed text in server HTML; one h1; head and JSON-LD
unchanged (diffed); no URL change; mobile nav keeps category links; the switch
is a cookie, never a URL parameter.

## 12. Step plan
Switch description. | PR | Content | Metric on the phone |
Order rationale. "Each PR its own branch, stacked; one release PR."

## 13. Testing on the phone
Scripts, setup, coordinate conversion, probes, what to walk through per PR.
### Sweep of all pages (checklist — see sweep-checklist.md)

## 14. Risks | Risk | How we hold it |

## 15. Corrections and deviations from the inventory

## 16. Decided (date)
1. **Topic (owner, date):** decision. ~~Superseded text~~ Replaced by 7.

## 17. Files of this package and sources (web sources marked "known only from
a search summary — read the original before relying on it")

## 18. Unverified
- Item — what was done instead (headless only / script only / nobody looked).
- ~~Item~~ Verified in PR n: how.
```

Notes from use:

- Keep the result columns honest: write "8 (es: 8)" or "not measured", never
  leave a cell that reads as passed.
- Every number states its viewport; one study measured 384×727 while the brief
  said 706 — the difference was an "offline" info bar.
- When the spec and a later owner verdict disagree, update the spec in the same
  PR as the code, so the next agent does not rebuild the rejected variant.
