---
name: code-review
description: >
  Sandwich-structured code review for PRs, MRs, diffs, or pasted code.
  Triggers on: "review this", "check my PR/MR", "what do you think of this code",
  "is this OK to merge", or any paste of code/diff where the user wants feedback.
  Produces motivating reviews that clearly separate blockers from nitpicks.
  Always use this skill — even for quick reviews. The structure matters.
---

# Code Review Skill

Goal: leave the author feeling **capable and motivated**, not defensive.
The review should make them think "yes, I'm on the right track, let me fix that one thing."

---

## The Sandwich Method (always follow this order)

### Top Slice — Overall

- Open with genuine recognition of what's good
- Name the design pattern or approach and why it's solid
- One short paragraph, no hedging, no "but..."
- Example: *"Separating analytics into its own component via CustomEvents is a clean SRP refactor — event-driven decoupling between components is well-designed here."*

### Filling — Bugs & Notes

#### Bug / Blocker (must fix before merge)

- State the bug clearly and directly
- Show the broken code, explain WHY it's wrong
- Provide the fix — exact code, not vague direction
- One blocker per section. If there are multiple, list them all here.

#### Minor Notes (optional, low pressure)

- Numbered list
- Each note: what it is + why it matters (or why it's just a preference)
- Explicitly label style preferences vs. real issues: *"Style preference, not a bug — current approach works."*
- Include positive observations too (e.g., "No double-fire risk — verified both paths are cleanly separated.")

### Bottom Slice — Verdict

- Clear, confident closing statement
- Name the blocker(s) and say everything else is solid
- Example: *"Bug with `id` is the only blocker. The rest is clean and well thought-out."*
- Optional: one motivating sentence — not sycophantic, just human

---

## Tone Guidelines

- **Direct, not harsh.** Say "this is wrong" not "you might want to consider..."
- **Specific, not vague.** Always show code. Never say "the naming could be better" without showing the fix.
- **Proportional.** A 5-line nit doesn't get 3 paragraphs.
- **Honest about preferences.** If it's a style preference, say so. Don't dress up opinions as bugs.
- **Push, don't crush.** The goal is the author merging better code AND feeling good about it.

---

## Example Output Structure

```
## Overall
[positive opening paragraph about the approach]

## Bug
[blocker description]
[broken code snippet]
[fix snippet]

## Minor Notes
1. [note with label: bug / style preference / positive observation]
2. ...

## Verdict
[confident closing + blocker summary]
```

---

## Edge Cases

- **No bugs found?** Still follow the sandwich. The filling becomes only minor notes.
- **Multiple blockers?** List all under "Bug / Blocker". Don't bury them in minor notes.
- **Tiny snippet / quick question?** Keep the structure but compress it — 3 short paragraphs is fine.
- **Architecture review (no diff)?** Same structure applies — "blockers" become design risks.
