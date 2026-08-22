# Implementation brief — what the implementer agent gets

The implementer starts with nothing but the repo and the tools. The brief is
what turns an issue into work it can finish without asking. Two rules shape
it:

- **Pointers, not copies.** Point at the issue identifier, the document
  names, the file paths, the previous commits. Paste only what the agent
  cannot fetch itself (it has no Linear MCP, the spec is in a conversation)
  and what exists nowhere else yet: the design decisions made in §4 and the
  boundaries. A brief that re-narrates the issue drifts from it; a pointer
  does not.
- **The verifier's brief is the opposite** — it gets *only* the acceptance
  criteria and a URL, never a pointer to the diff, the branch or this brief.
  See [verification.md](verification.md).

## Template

```markdown
# <ISSUE-ID> — <title>

## Read first (pointers)
- Linear issue <ISSUE-ID> — description and acceptance criteria are binding.
  (If you cannot reach Linear: the criteria are pasted under "Spec" below.)
- Linear documents: "<Spec document>", "<Snippets document>" — sections <…>.
- Repo: `CLAUDE.md` (hard rules — non-negotiable), `<progress file>`, and these
  files: `app/…`, `app/…` (the shape you extend). Reference implementation: `<path or repo>`.
- Previous work on this area: commits <sha>, <sha>; PR #<n>.

## Design decisions (already made — do not reopen)
- <decision 1 and why; what it rules out>
- <interface / schema / edge case that the issue description now carries>
- <what must never reach the client / what the migration must keep readable>

## Working rules
- Branch: `<gitBranchName>` (exists / create from <default branch>). Small commits, clear messages, repo language.
- Gate: `<gate command>` — run it bare as you go; its exit code is the verdict.
- Test-first for pure logic. Prefer invariants over transcribed outputs.
- Test integrity is absolute: never delete, skip, weaken or retarget a test to get green. A red test is a finding — report it. If a test is genuinely wrong, say so in the commit message.
- New dependency? Verify it exists and is the intended package before installing; install through the lockfile.
- Keep `<progress file>` current (done / failed and why / open) and commit it with the work.
- Scope is the acceptance criteria. Anything else you notice goes into your report as "out of scope: …", not into a commit.

## Boundaries (hard)
- No push, no PR, no release, no Linear writes. Commit locally and report.
- Do not touch: <confirm_before_editing paths>.
- Do not change: <tests / files / behaviours the design fixed>.

## Report back (your final message)
- What was done, per acceptance criterion.
- The gate's final exit status and the test count delta.
- What you could not do and why; what you found out of scope.
- Anything the orchestrator must know before verification (a seeded account, a flag, a migration to run).
```

## Follow-ups to the same agent

A red-gate finding from review, a failed e2e criterion, a missing test — goes
back to the **same agent** with `SendMessage`, not into inline edits by the
orchestrator and not into a fresh agent. It has the context; a new one would
rebuild it. The message is short: what failed, the evidence, what "fixed"
looks like.

If the agent died mid-task (timeout, crash), commit its partial state first,
then start a new one whose "Read first" pointers include those commits.
