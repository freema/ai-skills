---
name: product-hunt-launch
description: "Fill out a Product Hunt launch/submission form end-to-end via the chrome-devtools MCP — name, tagline, description, launch tags, thumbnail, gallery upload, makers, pricing — then STOP before publishing. Trigger: 'launch on Product Hunt', 'submit to Product Hunt', 'fill the PH form', 'Product Hunt draft'."
---

# Product Hunt Launch (form automation)

Drive the Product Hunt submission wizard with a real browser and land a **complete draft** the user reviews and publishes themselves. The form is a React SPA with controlled inputs and a dnd-kit gallery — naive `fill`/click tools mangle it. This skill encodes the techniques that actually work and the safety stops.

> **Read [references/browser-automation-gotchas.md](references/browser-automation-gotchas.md) BEFORE touching any field.** The React-input and file-upload traps below cause silent data corruption (dropped characters, reverted values, wrong tile → prompt dialog) that you won't catch from a screenshot alone.

---

## Hard safety stops (never cross these)

1. **Never log in for the user.** The user authenticates on producthunt.com themselves. Passwords / OAuth are theirs.
2. **Never click `Schedule launch for later`** (or any Publish/Submit-live control). That is the public launch — the user's decision, always.
3. **`Create draft` is a save** (private, editable) — still hand the click to the user unless they explicitly say "save the draft".
4. **Skip "Connect with Investors"** — personal fundraising narrative; the user's private call. Leave blank.
5. **Do not fabricate Shoutouts** (they are public founder *reviews* in the user's voice). Offer to draft; don't post without approval.
6. **Never solve a CAPTCHA / bot check.**

## Tooling

Use the **`chrome-devtools` MCP**, not `claude-in-chrome`. The claude-in-chrome browser runs in a separate context that often can't reach the user's session or `localhost`; the chrome-devtools Chrome is one the user can log into and you fully control.

Load once: `list_pages, new_page, navigate_page, take_screenshot, take_snapshot, click, fill, fill_form, evaluate_script, upload_file, handle_dialog, wait_for`.

## The flow

`/posts/new` → paste product link → **Get started** → then the left-nav steps:

| Step | What to set |
|------|-------------|
| **Main info** | name (product name only), tagline (**≤60 chars**), links (open-source ✓, X handle), description (≤500), **launch tags (≤3)**, first comment (maker story) |
| **Images and media** | thumbnail (**240×240**), gallery (**first image = social preview**), optional video/Loom |
| **Makers** | "I worked on this product" if the user built it (→ Hunter + Maker) |
| **Shoutouts** | optional; skip unless user supplies real reviews |
| **Extras** | pricing (Free / Paid / Paid+trial), optional promo code |
| **Connect with Investors** | **skip** (personal) |
| **Launch checklist** | verify "Required 100% Complete" → hand `Create draft` / `Schedule` to the user |

PH auto-imports the product **name, description, and a placeholder gallery card from a GitHub URL** — overwrite the name/description with the user's copy. The GitHub placeholder card disappears automatically once you upload real gallery images.

## Setting fields — the one rule that matters

**Set every text field with `evaluate_script` + the native value setter, NOT `fill`/`fill_form`.** React controlled `<input>`s drop characters and append to existing values; textareas fill but silently revert on the next re-render.

```js
() => {
  const setVal = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const els = [...document.querySelectorAll('input, textarea')];
  // identify by placeholder, then set
  setVal(els.find(e => /name of the launch/i.test(e.placeholder||'') || e.value.startsWith('GitHub')), 'Vellum');
  // ...
  return true; // then VERIFY via a fresh snapshot — check the char counter matches
}
```

**Always verify** with a fresh `take_snapshot` (or a JS read of `.value`) — the visible screenshot can show correct text while React's state still holds the old value. The character counter (`306/500`) is the tell.

## Launch tags (combobox) & gallery — see the reference

- **Tags:** type into the search via native setter (triggers the dropdown), then select the option with the **native `click` tool on the option's uid** from a snapshot. A JS `.click()` on the option `<span>` does nothing.
- **Thumbnail / gallery upload:** `upload_file` needs a path **inside a workspace root** — copy images into the project dir first. Upload one file at a time to the gallery **"+" upload tile** (it appends). The adjacent **"Paste a URL" tile opens a prompt dialog** — if you hit it, `handle_dialog({action:'dismiss'})`.
- **Reordering the gallery is not automatable** (dnd-kit ignores synthetic key/mouse events; delete buttons are CSS `:hover`-gated). Hand reordering/deletion to the user, or fully control order by uploading in the desired sequence.

Full details, snippets, and failure modes: **[references/browser-automation-gotchas.md](references/browser-automation-gotchas.md)**.

## Content cheatsheet

- **Tagline:** ≤60 chars, benefit-first, no period.
- **Description:** ≤500 chars, "what's new/different vs existing products".
- **Topics/tags:** up to 3; pick the highest-traffic relevant ones (e.g. Developer Tools, Artificial Intelligence, Open Source).
- **First comment:** the maker's story — the problem, why you built it, one ask for feedback. Posts on launch.
- **Gallery:** hero card first (social preview) → product screenshots → concept/feature cards → "by the numbers". ~6–9 images. A **15–30 s demo GIF/video** is the single highest-ROI asset.

## Snapshots are huge

The a11y snapshot includes the full footer (~700 lines). Save it to a file **inside the workspace root** (`take_snapshot({filePath})`) and `grep` for the uids you need — keep it out of context.
