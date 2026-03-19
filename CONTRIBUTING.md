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

Run both validators before pushing to catch issues early.

### Install

```bash
# skill-validator (Go)
go install github.com/agent-ecosystem/skill-validator/cmd/skill-validator@latest

# agnix (npm)
npm install -g agnix
```

### Validate a single skill

```bash
skill-validator check --strict skills/my-skill/
agnix --target claude-code --strict skills/my-skill/
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

CI runs both tools on every PR touching `skills/`. Errors block the merge; warnings are informational.

## Guidelines

- Keep `SKILL.md` under 500 lines — move detailed docs to `references/`
- Write clear `description` fields — they determine when the AI loads the skill
- Include practical code examples and anti-patterns
- Test with both Claude Code and Cursor before submitting
