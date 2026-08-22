# Verification — push coverage down, keep the verifier blind

Coverage belongs at the cheapest level that can carry it. A unit test runs in
milliseconds on every push forever; an HTTP check takes two minutes once; a
browser run costs ten minutes, happens once, and is the one level that cannot
be re-run cheaply. Every rule below follows from that and from one more:
**the verifier never sees the diff.**

## The ladder

| Level | Who | Carries | Cost |
|---|---|---|---|
| Unit / functional tests | implementer agent, in the diff | rules: scoring, generators, validation, state transitions, what a view may and may not contain | ms, forever |
| HTTP checks | orchestrator, `curl` or a short script | status codes, tampering (a crafted body the server must refuse), secret leaks (grep the served HTML and bundles), headers, redirects | 2 min, once |
| Browser e2e | a cheaper model, black-box | the key flow by mouse and keyboard, state surviving a reload, the mobile viewport, console errors | 3–10 min, once |

If an e2e step could have been a Vitest (or equivalent) case, the finding is a
missing test, and writing it is part of the issue.

## The gate

Run it **bare**. `task verify | grep error` reports grep's exit code, not the
gate's — a lint error scrolls past and the commit lands red. Either run it
without a pipe or check `$?` / `${PIPESTATUS[0]}` explicitly.

## HTTP checks — done by the orchestrator

Before spawning anything:

```bash
# status + a tamper attempt the server must refuse
curl -s -o /dev/null -w '%{http_code}\n' "$URL/api/thing"
curl -s -X POST "$URL/api/thing" -H 'content-type: application/json' \
     -d '{"score":999999}' -w '\n%{http_code}\n'

# secret leak: fetch the page and every bundle it references, grep for what must not be there
curl -s "$URL/play" > /tmp/page.html
grep -oE '/assets/[^"]+\.js' /tmp/page.html | sort -u | while read -r b; do
  curl -s "$URL$b"; done > /tmp/bundles.js
grep -nE 'answer|solution|<secret pattern>' /tmp/page.html /tmp/bundles.js && echo LEAK || echo clean
```

**Confirm the check fails without the fix.** Stash the change (nothing
running), re-run, see it go red, restore. A check that passes for a reason you
have not established is not evidence — and a check built on a guessed wire
format happily passes or fails for its own reasons.

**Assert on what a user or a screen reader would perceive** — rendered text,
an accessible name, a status code — not on a serialization. SSR frameworks
dedupe strings in their hydration payload and emit arrays as reference indices:
`"revealed",37` does not mean the value is 37. Grepping a payload produced two
false bug reports in one day.

## The e2e pass

**Spawn:** an `Agent` on a cheaper model (`model: "sonnet"` in Claude Code)
with the browser tooling the config names (Chrome DevTools MCP by default).

**It gets only:**

- the acceptance criteria, reworded as observable outcomes (≤ 5, aim for 2–3);
- the URL (live after a release, otherwise the local dev server) and the test
  login path/key from the config — never a production credential;
- the reporting format below.

**It never gets:** the diff, the branch name, the plan, the implementer's
report, or this skill. A verifier that knows how the code works stops testing
the requirement and starts confirming the code.

**Size:** the main scenario only. A five-criterion run stalled at 23 minutes
and produced nothing; the same feature checked as two browser-only criteria
(everything else moved to an HTTP script) finished in 2.6 minutes with better
evidence. Enumerating every button, badge and highlight is not thoroughness —
it is the same assurance an order of magnitude slower, in the one place that
cannot be re-run cheaply.

**Do not touch the working tree while it runs** — not an edit, not a
`checkout`, `reset`, rebase or stash. The dev server hot-reloads; anything that
changes the tree changes the page under a black-box tester and sends it chasing
elements that no longer exist. Land your edits *and* your branch mechanics
before you spawn it. If the tree moved anyway, throw the run away and re-run —
do not read the report.

**A bug-fix criterion asserts the invariant, not the symptom.** "After a
reload the bought digit is still there" passed while the fix was still broken:
the cell had lost its *lock*, so the board would again show a value the server
refuses. The criterion missed by one word and the bug walked back in through
the gap. Ask what invariant the fix establishes, then test that.

**Report format** (the agent's final message, posted verbatim to Linear):

```
E2E — <URL> — <commit sha if visible in the page / health endpoint>
1. <criterion> — PASS|FAIL — evidence: <screenshot path>, <status codes seen>, console errors: <n>
2. …
Account used: <test account>
Notes: <anything odd that is not a criterion>
```

Conclusions without artifacts do not count. The agent never fixes code and
never touches Linear.

## After a release

- `/health` must report **the version you just released** — a 200 from the
  previous image looks identical.
- `gh run list --limit 1` right after `gh release create` usually returns the
  *previous* run, already green, so a deploy that never started reads as a
  success. Match by title: `gh run list --json displayTitle,status,conclusion`.
- Smoke the key flow against the live URL (same blind agent, one or two
  criteria), then watch the error tracker for the new release for ten minutes.
  A spike in new issues means roll back first, investigate second.

## When to skip

Docs-only and test-only diffs need no e2e pass — say so in the Linear comment
so the absence is a decision, not an omission. Everything else gets the ladder.
