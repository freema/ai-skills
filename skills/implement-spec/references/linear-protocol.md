# Linear protocol — the queue, the claim, the hand-back

Linear is three things for the loop at once: the **queue**, the **claim
protocol** between humans and the loop, and the **channel** back to the humans.
The rules below keep all three truthful.

## Tools

Resolve the exact tool names with ToolSearch at the start of each iteration
(builds differ: `mcp__linear__…`, `mcp__claude_ai_Linear__…`). You need:

| Purpose | Tool |
|---|---|
| Queue | `list_issues` (filter: project, team, `assignee: "null"`, state) |
| Detail + acceptance criteria | `get_issue` (description, `gitBranchName`, milestone, labels) |
| Spec documents | `list_documents` / `get_document` (project documents named in the config or the issue) |
| State names | `list_issue_statuses` (is there a `Waiting`?) |
| Claim / move / assign / create | `save_issue` |
| Comments | `save_comment` |

The API token usually **cannot create states, labels or teams** — if `Waiting`
does not exist, use `Todo` and tell the owner once, in a comment, that a
`Waiting` state would make the board clearer.

## Selecting an issue

```
candidates = list_issues(project, team, assignee: "null", state ≠ Done/Canceled)
drop: anything with a BLOCKED: comment from the loop that has not been answered
drop: anything In Progress that has no branch with commits      ← that is a human's "this next" hint; treat it as top priority among the rest, not as resumable work
resume: In Progress + unassigned + branch with commits           ← your own unfinished work, always first
order: milestone order (as the project lists them) → priority (Urgent > High > Medium > Low) → issue number
       issues without a milestone come after every milestone
```

**An assigned issue is never a candidate**, even if it is the obvious next
step, even if the assignee is inactive. Assignment is a human's claim; the only
assigned issue the loop may take is one passed explicitly as an argument and
assigned to the user running the loop.

## Claiming

1. `save_issue(state: "In Progress")`.
2. Comment (project language), one line:

   > Začínám — větev `graslt/abc-123-short-title`. *(cs)*
   > Starting — branch `graslt/abc-123-short-title`. *(en)*

3. Branch from the issue's `gitBranchName`. Do not invent a name.

## Comments the loop posts

Keep every comment short and factual. Humans read these on a phone.

**E2E report** (after verification):

```
E2E — <commit sha> — <URL>
1. <criterion> — PASS — <evidence: screenshot link / status code / console errors: 0>
2. <criterion> — FAIL — <what was seen, where>
HTTP checks: <what was curled and the result>
Unit/functional: <n> new tests — <what invariant they pin>
```

**Review note** (after the quick inline review):

```
Review: looked at <areas>. Filed as follow-ups: ABC-130 (…), ABC-131 (…). No red-gate findings.
```

**Done** (with the state change):

```
Done — PR #<n> (<sha>)<, released in vX.Y.Z>.
<two or three lines: what changed, what was deliberately left out and filed where, what the ratchet added (test/lint rule)>
```

**BLOCKED** (with the hand-back — see below):

```
BLOKOVÁNO: <exactly what is needed from you — a credential, a decision between A and B, access to X>.
Hotovo bez toho: <what already exists on the branch / what the loop can still do>.
Až to bude: <what the loop does next, so you know what unblocking triggers>.
```

(`BLOCKED:` in English projects; the keyword must stay greppable, so keep it
at the start of the comment.)

## Follow-up issues

Everything discovered and left out of scope becomes an issue **in the same
project**, created by the loop:

- title in the project language, imperative, specific;
- description: one line of rationale, the originating issue linked, the
  smallest acceptance criterion that would close it;
- milestone: the originating issue's unless it clearly belongs later;
- priority: Low unless it is a correctness or security finding;
- **unassigned** — so the loop can pick it up. Assign it to the owner only if
  it needs a human decision, and then add a `BLOCKED:` comment too.

Small related follow-ups may be batched into one iteration when they touch
the same code — one branch, one PR, every issue closed with its own Done
comment.

## Handing back (Waiting)

An issue the loop cannot finish gets all three, in one `save_issue` call plus
one comment:

1. `assignee: <owner>` — it lands in their inbox;
2. `state: "Waiting"` (or `"Todo"` if the team has no Waiting state);
3. the `BLOCKED:` comment above.

Never leave it In Progress — In Progress means work is underway *right now*.
The board is only useful while it tells the truth about what is moving.

## Milestones and documents

- Milestones are the loop's outer order (M1 → M2 → …). At the end of a
  milestone, tag `review/mX` and run the independent review if configured.
- Project documents (spec, snippets, process, design reference) are sources of
  truth **after** the issue description: the description wins when they
  disagree, and the disagreement goes into a comment so the owner can fix the
  document.
- Design notes that change a shape (schema, API, security boundary) are
  written **into the issue description**, not only a comment — comments are
  editable and get lost; the description is what the implementer and a later
  reviewer work from.
