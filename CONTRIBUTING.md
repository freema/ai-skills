# Contributing

## Skill Structure

Each skill lives in `skills/<skill-name>/` and must contain a `SKILL.md` with YAML frontmatter:

```yaml
---
name: my-skill
description: "Short description — determines when the AI auto-loads the skill"
---
```

Detailed docs go into a `references/` subdirectory.

## Local Validation

Run the validators and the security scan before pushing to catch issues early.

### Install

```bash
# skill-validator (Go)
go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@latest

# agnix (npm)
npm install -g agnix

# SkillSpector (Python 3.12+), the commit CI pins
pip install "git+https://github.com/NVIDIA/skillspector.git@091a509b3d6ba8ff5be528966e1f43c2e68cf214"
```

### Validate a single skill

```bash
skill-validator check --strict skills/my-skill/
agnix --target claude-code --strict skills/my-skill/
skillspector scan --no-llm skills/my-skill/ --baseline .skillspector/my-skill.yaml   # --baseline only if the file exists
```

### Validate all skills

```bash
skill-validator check --strict skills/
agnix --target claude-code --strict skills/
```

### Exit codes

| Tool             | 0    | 1      | 2            |
|------------------|------|--------|--------------|
| skill-validator  | Pass | Errors | Warnings only |
| agnix            | Pass | Errors | —            |
| skillspector     | Risk score ≤ 50 | Risk score > 50 | Scan error |

CI runs all three tools on every PR touching `skills/`. Errors, a SkillSpector score above 50 and a scan error block
the merge; warnings are informational.

### SkillSpector findings

A finding is either a real problem, fixed in the skill, or something the skill does on purpose (reading its own API
key, calling `ffmpeg`, deleting a cache it documents). For the second kind, add a rule to
`.skillspector/<skill>.yaml` with a `reason`, scoped as tightly as the finding allows: the rule `id`, the `path`
of the file and a `message` glob over the matched text. Never suppress a whole rule across a skill to make CI green.
Prefer fixing the source when the finding is cosmetic (padded markdown tables trip the hidden-whitespace rule).

## Guidelines

- Keep `SKILL.md` under 500 lines — move detailed docs to `references/`
- Write clear `description` fields — they determine when the AI loads the skill
- Include practical code examples and anti-patterns
- Test with both Claude Code and Cursor before submitting
