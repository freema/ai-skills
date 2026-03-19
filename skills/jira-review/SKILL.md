---
name: jira-review
description: >
  Post code review verdicts to Jira. Use after a code review is done and the user
  wants to sync the result to Jira. Triggers on: "post to Jira", "update the ticket",
  "sync review to Jira", or when a review is complete and Jira context is available
  (project key, issue number, or Atlassian MCP connected).
  Posts a concise verdict comment, flags blockers, and suggests workflow transitions.
---

# Jira Review Sync

Post a concise code review verdict to the relevant Jira issue after a PR/MR review.

---

## When to Use

- After a code review is complete (use the `code-review` skill first)
- When the user explicitly asks to post/sync the review to Jira
- When Jira context is available: project key, issue number, branch name, or Atlassian MCP connected

---

## Workflow

1. **Find the issue** — search by MR/PR title or branch name if not provided directly
2. **Post the verdict** as a Jira comment (short summary, not the full review)
3. **Flag blockers** explicitly in the comment
4. **Suggest next transition** if no blockers (e.g., "Ready for QA")

---

## Jira Comment Template

```
Code Review: [MR/PR title]
Approach: [one sentence on what's solid]
Blocker: [blocker description + fix] / No blockers found
Minor notes: [count] (details in MR)
Verdict: [Ready to merge after fix / Approved / Needs rework]
```

---

## Actions After Posting

- **Blocker found?** Add sub-task or comment with the fix description
- **No blockers?** Suggest transitioning the issue to the next workflow state
- **Multiple blockers?** List all of them in the comment — don't split across sub-tasks

---

## Edge Cases

- **No Jira issue found?** Ask the user for the issue key. Don't guess.
- **No review done yet?** Run the `code-review` skill first, then come back here.
- **No Atlassian MCP connected?** Output the comment template for the user to paste manually.
