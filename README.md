# Agent Skills

A curated collection of AI agent skills for game development — compatible with **Claude Code** (Anthropic) and **Cursor IDE**.

Built around the [PixelDen](https://pixelden.io) game development workflow: Phaser 3 game engine, Gemini image generation, and PixelLab pixel art tooling.

## Available Skills

| Skill | Description |
|-------|-------------|
| **[phaser-gamedev](skills/pixelden/phaser-gamedev/)** | Build 2D browser games with Phaser 3 — scenes, sprites, Arcade/Matter physics, tilemaps, animations, keyboard input |
| **[image-generation](skills/pixelden/image-generation/)** | Generate game assets via Google Gemini API and process them into final sprite files |
| **[pixellab](skills/pixelden/pixellab/)** | Generate pixel art assets using PixelLab MCP — Wang tilesets, characters, map objects |

Each skill includes detailed reference material covering common pitfalls, anti-patterns, and production-ready code patterns.

## Installation

### Claude Code

Skills are installed by placing them in your project's `.claude/skills/` directory.

**Option A: Clone the whole repo into your project**

```bash
# From your project root
git clone https://github.com/freema/agent-skills.git .claude/skills/agent-skills
```

**Option B: Copy individual skills**

```bash
# Copy just the skill you need
cp -r agent-skills/skills/pixelden/phaser-gamedev .claude/skills/phaser-gamedev
```

Once installed, skills appear as `/slash-commands` in Claude Code. For example, `/phaser-gamedev` will load the full Phaser 3 development guide into context.

> **How it works:** Claude Code reads the `SKILL.md` file's frontmatter (`name`, `description`) at startup. The `description` field determines when Claude automatically loads the skill. The full content is only loaded when relevant.

#### SKILL.md Format

```yaml
---
name: my-skill
description: "Short description for trigger matching"
---

# Skill Title

Your markdown instructions here.
```

### Cursor IDE

Rules are installed by copying `.mdc` files into your project's `.cursor/rules/` directory.

```bash
# From your project root
cp -r agent-skills/cursor/rules/*.mdc .cursor/rules/
```

Rules are automatically loaded by Cursor's AI agent based on the `description` field and `globs` pattern matching.

#### .mdc Format

```yaml
---
description: "Short description for agent-requested loading"
globs: "**/*.ts"
alwaysApply: false
---

# Rule Title

Your markdown instructions here.
```

**Activation modes:**

| Mode | When |
|------|------|
| `alwaysApply: true` | Loaded into every conversation |
| `globs: "pattern"` | Auto-attached when working with matching files |
| Agent Requested | AI reads `description` and decides based on context |

## Repository Structure

```
agent-skills/
├── skills/                          # Claude Code skills (SKILL.md)
│   └── pixelden/
│       ├── image-generation/
│       │   └── SKILL.md
│       ├── phaser-gamedev/
│       │   ├── SKILL.md
│       │   └── references/          # Detailed reference docs
│       │       ├── arcade-physics.md
│       │       ├── core-patterns.md
│       │       ├── keyboard-input.md
│       │       ├── performance.md
│       │       ├── spritesheets-nineslice.md
│       │       └── tilemaps.md
│       └── pixellab/
│           └── SKILL.md
├── cursor/                          # Cursor IDE rules (.mdc)
│   └── rules/
│       ├── pixelden-image-generation.mdc
│       ├── pixelden-phaser-gamedev.mdc
│       └── pixelden-pixellab.mdc
├── LICENSE
└── README.md
```

## Contributing

1. Fork this repository
2. Create a new skill in `skills/<author>/<skill-name>/SKILL.md`
3. Create a matching Cursor rule in `cursor/rules/<author>-<skill-name>.mdc`
4. Submit a pull request

### Guidelines

- Keep `SKILL.md` under 500 lines — move detailed docs to `references/` subdirectory
- Write clear `description` fields — they determine when the AI loads the skill
- Include practical code examples and anti-patterns
- Test your skill with both Claude Code and Cursor before submitting

## License

[MIT](LICENSE) - Tomas Grasl
