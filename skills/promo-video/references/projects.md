# Projects and files

Every video project has the same home, the same layout and the same file names, so the next video, or the next
agent, finds everything without asking.

## Where projects live

- **One home for all video projects:** `$PROMO_VIDEO_HOME`, default `~/promo-videos/`. One directory per video,
  named by a lowercase slug of its topic: `~/promo-videos/pixelden-new-games/`, `~/promo-videos/re-vs-clean-room/`.
  `scripts/new-project.sh <slug>` creates it there.
- **Outside every git repository.** Nothing from a video project is committed: not the renders, captures or voice
  takes, and not the composition code either. `new-project.sh` refuses to start inside a git work tree.
- **The skill is where code is versioned.** A project is a working copy of the template and scripts. When a project
  produces something worth reusing (a script fix, a new SFX, a gotcha), move it into the skill and release a new
  version; do not point other projects at a previous project's files.
- **Not inside the product's repository or the publishing repository.** Those refer to the project by path and to a
  render by its SHA-256 (see "Publications" below).
- **One project per video.** Languages, aspect ratios, and captioned and clean versions of the same video share
  one project. A series gets one project per episode, named `<series>-<nn>-<topic>`; start an episode by copying
  `scripts/` and `assets/js/` from the previous one.

## Layout

```text
<slug>/
  README.md     the record: status, output, decisions, made up on screen, sources and licenses, loudness, rebuild,
                publications
  facts.md      claim → source, made up on screen, don't claim
  script.md     the approved script or beat table, with who approved it and when
  index.html    the composition (generated, when a build script writes it)
  assets/       js/, vendor/, fonts/, images/, clips/; per-language generated data in assets/<lang>/
  audio/        vo/ (script.json, takes), music, stems, mix.wav; per-language audio in audio/<lang>/
  scripts/      the skill's scripts plus the project's own build steps
  research/     source material: product screenshots, transcripts, notes (optional)
  capture/      plans/ and raw/ recordings (optional)
  concepts/     style frames and concept pages (optional)
  review/       probe frames, contact sheets, SFX previews: scratch, safe to delete at any time
  renders/      deliverables only
  archive/      rejected or superseded versions, one subdirectory each, with the reason in README.md
```

Do not add other top-level directories (`snapshots/`, `exports/`, `v1/`, `tmp/`). A rejected version moves to
`archive/<what>/`, for example `archive/v1-silent/`. Scratch goes to `review/`. A zip for a client is built into
`renders/` and deleted after it is sent.

## Render names

`renders/<slug>[-<lang>][-<variant>]-v<N>.<ext>`

| Example | Meaning |
|---|---|
| `re-vs-clean-room-cs-v1.mp4` | Czech, captions burned in, first cut |
| `re-vs-clean-room-cs-clean-v1.mp4` | the same cut without burned-in captions |
| `re-vs-clean-room-cs-v1.srt`, `.vtt` | its sidecar captions (`python3 scripts/build_captions.py re-vs-clean-room-cs-v1`) |
| `pixelden-new-games-9x16-v2.mp4` | vertical version, second cut |
| `pixelden-new-games-ad30-v2.mp4` | 30 fps copy for an ad platform |
| `renders/web/pixelden-new-games-v2.{mp4,webm}` | web encodes from `deliver.sh` |

- Leave out `<lang>` for a video without speech or text in a language, and `<variant>` for the main version.
- **A render that has left the machine is never overwritten.** Once a file has been sent for approval, uploaded or
  posted, a new cut gets the next version number. Publication records pin the file's SHA-256, and an overwritten
  file breaks that link.
- Delete superseded renders that nobody outside the machine has seen. Keep every version that was sent or published.

## Publications

- The system that publishes keeps the publication record: the project slug and render name, the render's SHA-256,
  platform, account, date and the verified live URL. That may be a publishing service, a website repository or a
  marketing repository. It never holds a copy of the video.
- The project README gets one line per live post under "Publications": date, platform, account and URL. Add the line
  after the post is live and you have opened it.
- Post copy (titles, descriptions, hashtags) lives with the publication record. A project without a publisher keeps it
  in `README.md` under "Publications".

## Finishing a project

When the video is delivered:

1. Delete `review/` and any `node_modules/`.
2. Keep `README.md`, `facts.md`, `script.md`, the composition, `assets/`, the voice takes and stems (a re-take costs
   credits), and every render that was sent or published.
3. Set the README status line: `rendered locally`, `sent for approval <date>`, or `published` with the dates.

## Moving an existing project into the layout

1. Move the whole directory to `$PROMO_VIDEO_HOME/<slug>/`.
2. Rename top-level directories to the layout above (`snapshots/` → `review/`, old versions → `archive/`).
3. Rename renders to the naming scheme. Renaming does not change a file's SHA-256; update the path in every
   publication record that refers to it.
4. Remove the old location only after the publisher's records point at the new one.
