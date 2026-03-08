# Agent Skills

A curated marketplace of AI agent skills for game development — compatible with **Claude Code** (Anthropic) and **Cursor IDE**.

Built around the [PixelDen](https://pixelden.io) game development workflow: Phaser 3 game engine, Gemini image generation, and PixelLab pixel art tooling.

## Available Plugins

### pixelden

PixelDen game development toolkit.

| Skill | Description |
|-------|-------------|
| **[phaser-gamedev](skills/pixelden/phaser-gamedev/)** | Build 2D browser games with Phaser 3 — scenes, sprites, Arcade/Matter physics, tilemaps, animations, keyboard input |
| **[image-generation](skills/pixelden/image-generation/)** | Generate game assets via Google Gemini API and process them into final sprite files |
| **[pixellab](skills/pixelden/pixellab/)** | Generate pixel art assets using PixelLab MCP — Wang tilesets, characters, map objects |

Each skill includes detailed reference material covering common pitfalls, anti-patterns, and production-ready code patterns.

## Installation

### Claude Code

**Add this marketplace and install the plugin:**

```bash
# Add the marketplace
/plugin marketplace add freema/agent-skills

# Install the pixelden plugin
/plugin install pixelden@agent-skills
```

Skills will appear as `/slash-commands` (e.g. `/phaser-gamedev`, `/image-generation`, `/pixellab`).

**Update to latest version:**

```bash
/plugin marketplace update
/plugin update pixelden@agent-skills
```

### Cursor IDE

**Install via Cursor marketplace:**

```
/add-plugin freema/agent-skills
```

Or manually copy rules into your project:

```bash
# Clone and copy rules
git clone https://github.com/freema/agent-skills.git /tmp/agent-skills
cp -r /tmp/agent-skills/skills/pixelden/rules/*.mdc .cursor/rules/
```

Rules are automatically loaded by Cursor's agent based on the `description` field and file `globs` matching.

## Repository Structure

```
agent-skills/
├── .claude-plugin/
│   └── marketplace.json             # Claude Code marketplace manifest
├── .cursor-plugin/
│   └── marketplace.json             # Cursor IDE marketplace manifest
├── skills/
│   └── pixelden/                    # Plugin: pixelden
│       ├── .claude-plugin/
│       │   └── plugin.json          # Claude Code plugin manifest
│       ├── .cursor-plugin/
│       │   └── plugin.json          # Cursor IDE plugin manifest
│       ├── image-generation/
│       │   └── SKILL.md             # Gemini image generation skill
│       ├── phaser-gamedev/
│       │   ├── SKILL.md             # Phaser 3 game dev skill
│       │   └── references/          # Detailed reference docs
│       │       ├── arcade-physics.md
│       │       ├── core-patterns.md
│       │       ├── keyboard-input.md
│       │       ├── performance.md
│       │       ├── spritesheets-nineslice.md
│       │       └── tilemaps.md
│       ├── pixellab/
│       │   └── SKILL.md             # PixelLab MCP skill
│       └── rules/                   # Cursor IDE rules (.mdc)
│           ├── pixelden-image-generation.mdc
│           ├── pixelden-phaser-gamedev.mdc
│           └── pixelden-pixellab.mdc
├── LICENSE
└── README.md
```

## Plugin Format

### Claude Code (SKILL.md)

```yaml
---
name: my-skill
description: "Short description — determines when Claude auto-loads the skill"
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

1. Fork this repository
2. Create your plugin directory: `skills/<your-name>/`
3. Add `.claude-plugin/plugin.json` and `.cursor-plugin/plugin.json` manifests
4. Create skills as `<skill-name>/SKILL.md` and matching Cursor rules in `rules/<skill-name>.mdc`
5. Register your plugin in both marketplace manifests at the repo root
6. Submit a pull request

### Guidelines

- Keep `SKILL.md` under 500 lines — move detailed docs to `references/` subdirectory
- Write clear `description` fields — they determine when the AI loads the skill
- Include practical code examples and anti-patterns
- Test your plugin with both Claude Code and Cursor before submitting

## License

[MIT](LICENSE) - Tomas Grasl
