# Project config — what `implement-spec` reads from the repo

The loop is generic; the project is not. Everything project-specific lives in
the repo, in two places the loop reads at the start of **every** iteration:

1. a short **`## Implementation loop`** block in the repo's `CLAUDE.md`
   (the config below), and
2. the **progress file** (default `docs/progress.md`) — working state that
   must survive between iterations.

Nothing else carries over. Context is not a store.

## The `CLAUDE.md` block

```markdown
## Implementation loop (implement-spec)

- linear_team: BlindWatchamaker
- linear_project: Luštírna
- linear_language: cs            # language of issues and comments; default = what the issues already use
- owner: Tomáš                   # who blocked issues are handed back to (Linear display name or email)
- gate: task verify              # typecheck + lint + tests, real exit code
- dev: task dev                  # local stack; e2e falls back to this when there is no live URL
- local_url: http://localhost:3020
- live_url: https://example.com  # omit if the project has no deployed environment
- health: /api/health            # must report the running version, not just 200
- release: gh release create vX.Y.Z   # omit or "none" if there is no deploy pipeline
- release_policy: batched        # batched | per-task | none
- merge: gh pr merge --merge --auto   # the project's merge style
- e2e: chrome-devtools           # chrome-devtools | claude-in-chrome | playwright | none
- e2e_login: /auth/dev?key=…     # how the e2e agent gets a test session (never a production credential)
- confirm_before_editing:        # paths that need a human before an edit; empty = fully autonomous
  - .github/workflows/
- independent_review: codex      # codex | none — runs at milestone tags (review/mX), not per issue
- progress_file: docs/progress.md
```

Only `linear_team`, `linear_project` and `gate` are required. Everything else
has the default shown or is skipped when absent.

### Meaning of the keys the loop acts on

| Key | What the loop does with it |
|---|---|
| `linear_team`, `linear_project` | Scope of every `list_issues` call. Unassigned issues in this project are the queue. |
| `linear_language` | Language of every comment and issue the loop writes. Code, commits and PRs follow the repo's language regardless. |
| `owner` | Assignee for hand-backs (§11 of the skill): blocked issues, drained-queue summaries. |
| `gate` | Run bare in §1 and §6; exit code is the verdict. |
| `live_url` + `health` | §1 reachability check; §8 post-deploy version check; the URL the e2e agent gets after a release. |
| `release`, `release_policy` | `batched` (default): merge per issue, release per block of work or on urgency. `per-task`: release after every merge that changes the running app. `none`: merge only. |
| `e2e`, `e2e_login` | Which browser tooling the e2e agent is told to use and how it logs in. `none` = HTTP checks and unit tests only. |
| `confirm_before_editing` | The only paths that trigger a stop-and-ask. Derive from "does something run this file", not from history. |
| `independent_review` | A second opinion from outside the model family at milestone boundaries; never a per-issue gate. |

## Bootstrapping a project that has no block yet

If `CLAUDE.md` has no `## Implementation loop` block, the first iteration is
the bootstrap — nothing else:

1. Derive candidates from the repo: `package.json` scripts, `Taskfile.yml`,
   `Makefile`, `.github/workflows/`, a `Dockerfile`, a health route.
2. Derive the Linear side: `list_teams`, `list_projects`, the states of the
   team (`list_issue_statuses`) — note whether a `Waiting` state exists.
3. Write the block with what you found, mark every guess `# TODO confirm`,
   and create a `docs/progress.md` from the template below if it is missing.
4. Commit it on a branch, open the PR, merge it (the block is documentation,
   not a gate file), and end the iteration with a short summary asking the
   owner to confirm the `TODO` lines. Do not take an issue in the same
   iteration — the next one will, with the config in place.

## Progress file template

```markdown
# Progress

State that must survive between iterations. Context does not — this file does.
The loop reads it at the start of every iteration and commits it with the work.
Keep it short: working state, not a changelog — git history is the changelog.

## Current

- **In flight:** ABC-123 on `branch-name` — what is done, what is left.
- **Where it stands:** one paragraph on the project's current state.

## Failed approaches (do not retry)

- ABC-117: tried X, failed because Y; Z is the open alternative.

## Open questions for the owner

- …
```

Prune it as things land. A progress file that grows into a history is one the
next iteration will not read to the end.
