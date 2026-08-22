---
name: implement-spec
description: "Linear-driven implementation loop. Take the next unassigned issue from a Linear project and drive it to Done — orient, design, delegate the implementation, verify with a gate plus one blind e2e pass, quick non-blocking review, PR, merge, close in Linear with follow-ups, then the next issue. Serial, context-free between iterations, batched releases. Run once (/implement-spec), on one issue (/implement-spec ABC-123) or unattended (/loop 45m /implement-spec)."
disable-model-invocation: true
---

# implement-spec — the Linear implementation loop

You are the **orchestrator** of an implementation loop whose queue is a Linear
project. **One iteration = one issue driven to Done**: designed by you,
implemented by a delegated agent, verified, reviewed, merged, closed in Linear
with a comment — and then the loop turns and selects the next issue. It never
stops after one iteration; it ends only when the project has no issue left that
is neither Done nor waiting on a human. Never leave the repository red.

Five principles carry the whole thing. Everything below is their consequence.

1. **Context does not survive iterations; the repo and Linear do.** Every
   iteration starts from `git status`, the project's `CLAUDE.md`, its progress
   file and the gate — never from memory of the previous run.
2. **Serial, not parallel.** One issue is merged before the next is taken.
   Parallelism lives *inside* an issue (fan-out for reading, review, a judge
   panel), never across issues — so there is nothing to merge back and no
   merger agent. Throughput comes from running unattended, not from worktrees.
3. **Only a red gate blocks.** Review findings become follow-up issues; a
   failing gate (typecheck/lint/tests, CI, e2e) is the only thing that stops a
   merge. No pre-merge confirmations, no pre-merge fix loops.
4. **The verifier never sees the diff.** A tester that knows how the code works
   stops testing the requirement and starts confirming the code.
5. **Every failure that reached verification is a missing check.** Add the
   test, lint rule or policy test that would have caught it — in the same
   iteration. Prose rules erode as context fills; a check does not.

## 0. What the loop needs

- **Linear MCP** connected (`list_issues`, `get_issue`, `save_issue`,
  `save_comment`, `list_issue_statuses`, `get_document`). The exact tool names
  differ slightly between Linear MCP builds — look them up with ToolSearch once
  per iteration, do not guess.
- **A project config block** in the repo's `CLAUDE.md` (team, project, gate
  command, release command, live URL, e2e tooling). Format and defaults:
  [references/project-config.md](references/project-config.md). If the block
  is missing, bootstrap it first (derive what you can from the repo and Linear,
  write it, commit it) — that is the whole first iteration.
- **A gate command** that returns a real exit code (typecheck + lint + tests).
- **A progress file** (default `docs/progress.md`) — the only state that
  survives between iterations. Keep it short: current work, failed approaches,
  open questions. Git history is the changelog, this is not.

## 1. Orientation — before touching anything

1. `git status` and `git log --oneline -5`. Is the tree clean? Is there an
   unmerged branch from a previous iteration? A branch with commits whose issue
   is still In Progress is *your own unfinished work* — resume it (§2).
2. Read the progress file. Read `CLAUDE.md` again — compaction may have dropped
   the project's hard rules; they are non-negotiable and must be held fresh.
3. Run the gate. If the project has a live URL, hit its health endpoint.
   **Anything red before you start is your task** — the previous iteration left
   breakage and it comes first, before any new issue.

## 2. Task selection — the Linear protocol

Full detail: [references/linear-protocol.md](references/linear-protocol.md).
The short form:

- **Unassigned issues are the loop's queue. An assigned issue belongs to a
  human** — never take it, never edit it. Assignment is how people claim work on
  this backlog, and it is also how the loop hands work back (§11).
- Resume an **In Progress** issue only if it is unassigned *and* a branch with
  commits exists. In Progress with no branch means a human moved it there to
  say "this next" — a priority hint, not work already underway.
- Otherwise: milestone order as listed on the project, within a milestone by
  priority (Urgent > High > Medium > Low), then by issue number. Issues without
  a milestone come last. Skip anything blocked (§11).
- An explicit argument (`/implement-spec ABC-123`) overrides selection; it may
  not be an issue assigned to someone other than the user.
- **Claim it**: move it to In Progress and post a one-line comment that you are
  starting it and on which branch. Use the issue's `gitBranchName`.

## 3. Blast radius

- You may edit everything in the repo the config does not exclude — code,
  tests, docs, CI, build files. Migrations, auth and billing code merge
  autonomously too; the safety net is the gate + CI + additive-only migrations
  + a human reviewing the released result.
- **A file is a gate file when something *runs* it** — CI workflows,
  Dockerfiles, compose files, a real `.env`, anything on a server. Inert
  documentation, examples and templates are not, however deployment-shaped
  their names look. If the config lists `confirm_before_editing` paths, stop and
  ask before touching those; derive the list from the runs-it test, never from
  what it said last month.
- Secrets, servers and production config stay in human hands. The loop holds no
  credentials for them and must not ask for any.
- A decision with more than two plausible outcomes: pick the most reversible,
  record it in the issue, keep moving. Block only when the choice is genuinely
  irreversible or needs something only a human has (§11).
- **Never widen scope opportunistically.** Work outside the acceptance
  criteria becomes a new Linear issue, not an extra commit.

## 4. Design — inline, scaled to risk

Shape every issue before implementation, **inline** — no spawned design agent.
For an ordinary issue that is a few deliberate paragraphs inside the brief:
boundaries, conflicts with in-flight work, what to watch. For anything that
settles a shape that is expensive to rewrite — a data model, a security
boundary, a ledger, a public API — write a full design note **into the issue
description** (interfaces, schema, edge cases, what must never reach the
client, what a migration must keep backward compatible). Comments are editable
and get lost; the description is the spec the implementer and reviewers work
from.

## 5. Implementation — delegated

Production code is written by the **strongest available model**, never by a
smaller one: in Claude Code, an `Agent` with `model: "opus"` (or inline when
the session itself runs on it). The orchestrator writes the brief, spawns the
agent, and reviews its report and diff when it returns. Follow-up fixes go back
to the **same** agent (`SendMessage` keeps its context), not into inline edits
by the orchestrator.

The agent starts with nothing but the repo and its tools, so the brief is
what makes the issue finishable without questions. **Communicate through
pointers, not copies**: the issue identifier, the document names, the file
paths, the previous commits — paste only what the agent cannot fetch itself
and what exists nowhere else yet (the §4 design decisions, the boundaries).
Template: [references/implementation-brief.md](references/implementation-brief.md).
It always carries:

- a pointer to the issue — its description and **acceptance criteria are
  binding** — and to the relevant Linear documents or spec sections (pasted
  only when the agent has no Linear access);
- a pointer to the project's hard rules in `CLAUDE.md`, and the design
  decisions already made, stated as closed;
- the working rules: test-first for pure logic (prefer invariants over
  transcribed outputs), **test integrity is absolute** (never delete, skip,
  weaken or retarget a test to get green — a red test is a finding; if a test is
  genuinely wrong, say so in the commit message), verify new dependencies exist
  and are the intended package before installing, install through the lockfile;
- branch from `gitBranchName`, small commits, run the gate as you go, keep the
  progress file current and commit it with the work;
- **hard boundaries: no push, no PR, no Linear, no release.** Those are the
  orchestrator's.

A long-running agent that dies mid-task leaves work uncommitted — commit its
partial state before restarting anything.

## 6. Verification

Detail and the lessons behind each rule:
[references/verification.md](references/verification.md).

1. **The gate, bare.** Read its exit status, not a grep of its output — piping
   it into `grep`/`head` replaces the exit code with the filter's, and a lint
   error scrolls past into a red commit.
2. **Everything provable over HTTP, the orchestrator checks itself** with
   `curl` or a short script, before spawning anything: status codes, tampering
   (a crafted body the server must refuse), secret leaks (fetch the served HTML
   and bundles and grep them). Two minutes, better evidence than a screenshot.
   Confirm each check **fails without the fix** (stash, re-run, restore) —
   a check that passes for a reason you have not established is not evidence.
3. **One blind e2e pass** by a cheaper model (`Agent`, `model: "sonnet"`,
   Chrome DevTools MCP or whatever the config names). It gets **only** the
   acceptance criteria, the URL and test credentials — **never the diff, the
   plan or the reasoning**. **At most 5 criteria, aim for 2–3**, the main
   scenario only, minutes not a quarter of an hour. Everything a unit test or an
   HTTP check can carry is pushed down first; e2e is the most expensive level
   there is and runs once.
   - Do not touch the working tree while the agent runs — not an edit, not a
     `checkout`, `reset`, rebase or stash. Hot reload changes the page under a
     black-box tester; if the tree moved, throw the run away and re-run.
   - A criterion for a bug fix asserts **the invariant that prevents the bug**,
     not the symptom that was visible.
   - The report is **per criterion, PASS/FAIL with evidence** — screenshot,
     URL, commit SHA, console error count, status codes, the test account.
     Conclusions without artifacts do not count. The agent never fixes code
     and never touches Linear.
4. Post the e2e report (and screenshots) as a **comment on the Linear issue**.
   Fix what failed, re-run the whole pass, not just the failed step.
5. Skip e2e for docs-only and test-only diffs; say so in the Linear comment.

## 7. Review — quick, non-blocking

After verification is green the orchestrator **reads the diff itself, inline**
— correctness, security, the project's domain rules, obvious simplifications.
No multi-agent review workflows, no adversarial panels, no spawned review
agents, no pre-merge fix loops.

- A **red-gate finding** (would break the build, ship a secret to the client,
  corrupt data, violate a hard rule) goes back to the implementation agent
  before merge. That is the only thing that blocks.
- Everything else becomes a **follow-up Linear issue**, and the merge proceeds.
- One short review note on the issue: what was looked at, what was filed.
- If the config names an independent reviewer (e.g. a Codex CLI review at
  milestone tags), run it at milestone boundaries, not per issue.

## 8. Merge and release

- **No open PRs at iteration end.** Open the PR only when everything needed to
  merge it is in hand — verification and review done. Open it, let CI run,
  merge it, in the same iteration (`gh pr merge --merge --auto` or the
  project's merge style; never push straight to the default branch).
- **Merging is per issue; releasing is per block of work.** Cut a release when
  the block is worth looking at, when something is genuinely urgent (a live
  bug, a security fix), or when the config says `release_policy: per-task`.
  A deploy costs a pipeline run, a migration window and a slice of a human's
  attention — spending all three on one copy fix is waste. Between releases
  the loop keeps merging and the default branch accumulates.
- Migrations in a release are **additive only** (expand → migrate → contract):
  dropping or renaming ships in a *later* release, after the new version has
  run for a while — otherwise a rollback meets a schema it cannot read.
- After a deploy, **check the health endpoint reports the version you just
  released** — not merely 200. `gh run list --limit 1` right after
  `gh release create` often returns the *previous* run, already green; match
  the run by title and then trust only the live answer. Then a smoke pass of
  the key flow against the live URL, and watch the error tracker for the new
  release for ten minutes. A spike means roll back first, investigate second.
- Release notes list every issue in the batch.

## 9. Linear bookkeeping

Comments and issues are written in the **project's working language**
(config `linear_language`, default: the language the existing issues use) —
that is the humans' channel. Code, commits and PRs follow the repo's language
(usually English). Templates for every comment the loop posts:
[references/linear-protocol.md](references/linear-protocol.md).

- Issue → **Done** with a comment summarizing the work and linking the PR (and
  the release when one happened).
- **File follow-up issues** for everything discovered and left out of scope —
  review findings, missing tests, ideas — each with a one-line rationale and
  the originating issue linked. Small related follow-ups may be batched into
  one iteration when they touch the same code.
- Then turn the loop and select the next issue without pausing.

## 10. Ratchet

Every failure that reached verification is a missing rule, not bad luck. In
the same iteration add the check that would have caught it — a test, a lint
rule, a policy test, a line in `CLAUDE.md` — and say so in the Done comment.
Prose rules erode as context fills; a check does not.

## 11. When to stop and hand back to a human

A stop condition is never a follow-up issue — follow-ups are for out-of-scope
discoveries. The unattended loop resumes by itself when the situation changes.

**Waiting is a state, and In Progress is not it.** An issue blocked on a human
gets all three of:

1. **assigned to the human** who can unblock it (the config's `owner`, or the
   issue's creator),
2. moved to **`Waiting`** if the team has that state — otherwise back to
   **`Todo`** (check `list_issue_statuses`; an API token cannot create states),
3. a **`BLOCKED:`** comment (in the project's language) naming exactly what is
   needed and what is already done without it.

Stop conditions:

- The issue needs credentials, access or a decision only a human can make.
- A change to something the config lists under `confirm_before_editing`.
- **The same fix failed twice.** Stop guessing: diagnose inline, or delegate
  one focused diagnosis to a strong agent. If that does not resolve it, write
  the state into the progress file and the issue, hand it back. No third try.
- No unblocked issue left: hand every remaining issue back with a `BLOCKED:`
  comment, summarize the project state, and pause until something unblocks.
  **Never stop while an unblocked issue remains.**

Never leave an issue In Progress at the end of an iteration unless a branch
with commits is genuinely mid-flight.

## 12. Launch modes

| Invocation | Behaviour |
|---|---|
| `/implement-spec` | One pass: one issue to Done, then the drained-queue / next-issue summary and stop. |
| `/implement-spec ABC-123` | Same, but on that issue (must be unassigned or the user's own). |
| `/loop 45m /implement-spec` | Unattended: pass after pass; after the queue drains it pauses and picks work up on a later wake-up as soon as anything unblocks. |

## Anti-patterns (each one cost a real iteration somewhere)

- Giving the e2e agent the diff or the plan — it confirms the code instead of
  testing the requirement.
- Five browser criteria "to be thorough" — a run that stalls at 23 minutes
  produces nothing; the same feature as two browser criteria plus an HTTP
  script finished in under three with better evidence.
- `task verify | grep error` — the exit code you read is grep's.
- Trusting `gh run list --limit 1` after a release — it is usually the
  previous, already-green run.
- Asserting on a serialized payload instead of rendered text — framework
  payloads dedupe strings and reference arrays by index; `"revealed",37` does
  not mean the value is 37.
- Checking the symptom of a bug instead of the invariant the fix establishes —
  the bug walks back in through the one word the criterion missed.
- Leaving an issue In Progress "for tomorrow" with no branch — the board stops
  telling the truth about what is moving.
- Taking an assigned issue because it looks easy — assignment is someone's
  claim.
