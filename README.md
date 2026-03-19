# AI Skills

A curated collection of AI agent skills for software development — compatible with **Claude Code** and **Cursor IDE**.

## Available Skills

| Skill | Description |
|-------|-------------|
| **[phaser-gamedev](skills/phaser-gamedev/)** | Build 2D browser games with Phaser 3 — scenes, sprites, Arcade/Matter physics, tilemaps, animations, keyboard input |
| **[image-generation](skills/image-generation/)** | Generate game assets via Google Gemini API and process them into final sprite files |
| **[pixellab](skills/pixellab/)** | Generate pixel art assets using PixelLab MCP — Wang tilesets, characters, map objects |
| **[code-review](skills/code-review/)** | Sandwich-structured code reviews — motivating, clear, separates blockers from nitpicks |
| **[jira](skills/jira/)** | Post code review verdicts to Jira issues, flag blockers, suggest workflow transitions |

Each skill includes detailed reference material covering common pitfalls, anti-patterns, and production-ready code patterns.

## Installation

### Claude Code

```bash
# Add the marketplace
/plugin marketplace add freema/ai-skills

# Install a skill
/plugin install phaser-gamedev@ai-skills
```

Skills will appear as `/slash-commands` (e.g. `/phaser-gamedev`, `/image-generation`, `/pixellab`).

**Update to latest version:**

```bash
/plugin marketplace update
/plugin update phaser-gamedev@ai-skills
```

### Cursor IDE

Manually copy rules into your project:

```bash
git clone https://github.com/freema/ai-skills.git /tmp/ai-skills
cp -r /tmp/ai-skills/skills/<skill-name>/SKILL.md .cursor/rules/<skill-name>.mdc
```

Rules are automatically loaded by Cursor's agent based on the `description` field and file `globs` matching.

## Repository Structure

```
ai-skills/
├── .claude-plugin/
│   └── marketplace.json       # Claude Code marketplace manifest
├── .cursor-plugin/
│   └── marketplace.json       # Cursor IDE marketplace manifest
├── skills/
│   ├── phaser-gamedev/
│   │   ├── SKILL.md           # Phaser 3 game dev skill
│   │   └── references/        # Detailed reference docs
│   ├── image-generation/
│   │   └── SKILL.md           # Gemini image generation skill
│   └── pixellab/
│       ├── SKILL.md           # PixelLab MCP skill
│       └── references/        # Detailed reference docs
├── LICENSE
└── README.md
```

## Skill Format

### Claude Code (SKILL.md)

```yaml
---
name: my-skill
description: "Short description — determines when the AI auto-loads the skill"
---

# Skill content in markdown
```

### Cursor IDE (.mdc)

```yaml
---
description: "Short description for agent-requested loading"
globs: "**/*.ts"
alwaysApply: false
---

# Rule content in markdown
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for full details including local validation setup.

1. Fork this repository
2. Add your skill directory under `skills/<skill-name>/`
3. Create `SKILL.md` with frontmatter (name + description)
4. Run validators locally: `skill-validator check --strict skills/<skill-name>/` and `agnix --target claude-code --strict skills/<skill-name>/`
5. Submit a pull request — CI validates automatically

## License

[MIT](LICENSE) — Tomas Grasl
