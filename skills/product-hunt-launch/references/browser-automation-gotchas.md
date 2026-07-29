# Browser-automation gotchas (React SPA + dnd-kit)

Hard-won failure modes from automating the Product Hunt submission form. These generalize to most modern React form SPAs (controlled inputs, combobox selects, drag-sort galleries, hover-gated controls).

---

## 1. `fill` / `fill_form` corrupt React controlled inputs

**Symptom:** filling the name "Vellum" over "GitHub" yields `GitHubvllmvelu`; a 48-char tagline becomes `Sef-hosed CP servr…`. The tool types character-by-character into a controlled input whose `onChange` re-renders mid-type, so characters **drop** and the new value **appends** instead of replacing.

**`fill_form` is worse** — batching several fields makes some silently no-op (a textarea kept its original value entirely).

**Fix — always set values via `evaluate_script` + the native setter:**

```js
const setVal = (el, v) => {
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);   // bypasses React's value shadowing
  el.dispatchEvent(new Event('input',  { bubbles: true }));          // React reads value on 'input'
  el.dispatchEvent(new Event('change', { bubbles: true }));
};
```

Identify targets by `placeholder` (stable) rather than uid (changes across re-renders). Return diagnostics from the script so you can confirm without a screenshot.

## 2. Visible text ≠ committed state

After a plain `fill`, the textarea can **display** the correct text while React's internal state still holds the old value — and on the next re-render it **reverts**. A screenshot lies here.

**Verify** with a fresh `take_snapshot` and read the `value="…"` on the textbox node, or read `.value` in JS. The **character counter** (e.g. `125/500` vs `306/500`) is the fastest tell that state and DOM diverged.

## 3. Comboboxes: native setter to open, native CLICK to choose

For a search-select (launch tags):

1. Focus the search input, set its value via the native setter + `input` event → the option dropdown renders.
2. **Select the option with the chrome-devtools `click` tool** (a real CDP mouse click) targeting the option's `uid` from a snapshot.
   - A JS `.click()` / dispatched `MouseEvent` on the option `<span>` **does not register** — the row's handler wants a trusted click.
   - Selecting one option **clears the search**; that cleared search is your success signal. Re-type for the next tag.
3. dnd-kit / custom rows expose no `aria-label` on the option, so grep the snapshot for the option **text**, take its parent's uid.

## 4. File upload: workspace-root + append + the paste-URL trap

- `upload_file` **rejects paths outside the tool's workspace roots** (`Access denied … not within any configured workspace root`). Copy assets into the project dir first (e.g. a `.ph-tmp/` you delete afterward). Same restriction applies to `take_snapshot({filePath})` and `evaluate_script({filePath})`.
- Pass the **uid of the visible upload button/tile** ("Select an image", or the gallery **"+" tile**) — `upload_file` intercepts the file chooser it opens. The gallery input is `multiple`, and PH **appends** each uploaded file, so upload one at a time to the *same* tile; the tile's uid stays stable across uploads.
- **The paste-URL tile looks identical to the upload tile** ("+"). Targeting it makes the page call `window.prompt`, which **blocks the whole browser** until handled. Recover with `handle_dialog({action:'dismiss'})`. Identify the correct upload tile first (the one that actually opened a file chooser last time).

## 5. dnd-kit sortable reorder is NOT automatable

The gallery uses dnd-kit sortables (`aria-roledescription="sortable"`, "press space to pick up, arrows to move"). But:

- Dispatched `KeyboardEvent`s (Space/Arrow via JS) only **focus/select** the item — the KeyboardSensor ignores untrusted events, so nothing moves.
- Per-thumbnail **delete buttons are revealed by CSS `:hover`**, which synthetic `mouseover`/`pointerover` events **cannot trigger** (`:hover` needs a real pointer). So you can't find the delete control via JS either.

**Consequence:** you cannot reliably reorder or delete gallery items programmatically. Either (a) hand the drag to the user (trivial for them, if they can see the browser), or (b) control order by **uploading in the exact final sequence** (upload order = display order).

## 6. localhost is unreachable from claude-in-chrome

`claude-in-chrome` runs Chrome in a context that returned `ERR_CONNECTION_REFUSED` for `localhost:PORT` / `127.0.0.1:PORT` even though `curl` on the host worked (separate browser / network namespace). For anything touching a locally-running app **use the `chrome-devtools` MCP** (or drive a headless browser directly). Public sites (producthunt.com) work in either.

## 7. Snapshots are enormous

`take_snapshot` on a content page returns ~700 lines (the entire site footer every time). Save to a file inside the workspace root and `grep` for the handful of uids you need. Don't dump it into context repeatedly.

## 8. Generating a thumbnail / gallery cards

Playwright (`chromium.launch({ channel: 'chrome' })` to skip browser downloads when the pinned build mismatches the cache) renders brand-accurate HTML at `deviceScaleFactor: 2`. Element-screenshot a fixed-size node (`240×240`, `1270×760`) for pixel-exact assets. Google Fonts load fine over `file://` with network.
