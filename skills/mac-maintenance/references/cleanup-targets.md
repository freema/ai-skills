# Cleanup Targets Catalog

Reference for what lives where on macOS, and how safe it is to clear. Risk legend:

- ✅ **Safe** — regenerates automatically; clear freely (close the owning app first).
- ⚠️ **Decision** — real data loss possible; show contents / confirm before removing.
- 🚫 **Don't touch** — system, security, identity, or cloud-synced data.

## Caches — `~/Library/Caches/*`

Almost everything here is ✅ safe; the app rebuilds it on next launch (first launch is slower).

| Path | What it is | Risk |
|------|------------|------|
| `Caches/JetBrains` | PhpStorm/IntelliJ/DataGrip/WebStorm indexes & VCS caches | ✅ (close IDE) |
| `Caches/Yarn`, `Caches/pnpm` | Package-manager download caches | ✅ (`yarn cache clean` / `pnpm store prune` preferred) |
| `Caches/ms-playwright` | Downloaded browser binaries | ✅ (re-`playwright install` when needed) |
| `Caches/electron`, `Caches/node-gyp` | Electron & native-build download caches | ✅ |
| `Caches/typescript` | TS compiler cache | ✅ |
| `Caches/Homebrew` | Homebrew download cache | ✅ (`brew cleanup`) |
| `Caches/Google`, `Caches/Mozilla`, `Caches/Firefox` | Browser HTTP caches | ✅ (may log you out of nothing; history stays) |
| `Caches/com.apple.*` | OS caches | ✅ but let macOS manage most; low payoff |
| `Caches/*.ShipIt`, `Caches/*SoftwareUpdate` | App self-updater leftovers | ✅ |

## Logs & temporary

| Path | What it is | Risk |
|------|------------|------|
| `~/Library/Logs/*` | App & install logs | ✅ |
| `~/.Trash` | Trash — confirm it's meant to be emptied | ⚠️ (it's a deliberate action) |
| `/private/var/folders/**` | System temp | 🚫 (let macOS purge it) |

## Package-manager caches (prefer the tool's own command)

| Command | Clears |
|---------|--------|
| `brew cleanup` | Old formula versions + download cache |
| `yarn cache clean` | Yarn global cache |
| `npm cache clean --force` | npm cache |
| `pnpm store prune` | Unreferenced pnpm store content |
| `pip cache purge` | pip wheel cache |
| `go clean -cache` | Go build cache |
| `rm -rf ~/Library/Developer/Xcode/DerivedData/*` | Xcode build products |
| `rm -rf ~/Library/Developer/CoreSimulator/Caches/*` | iOS simulator caches |

## Containers — `~/Library/Containers/*`

Sandboxed app data. Mostly small, but two big ones recur:

| Path | What it is | Risk |
|------|------------|------|
| `Containers/com.docker.docker` (`Docker.raw`) | Docker Desktop VM disk image — grows, never auto-shrinks | ⚠️ reclaim via `docker system prune`, not `rm` |
| `Containers/com.microsoft.teams2`, messaging apps | App state + cached media | ⚠️ use in-app clear, not `rm` |
| Other `com.apple.*` containers | System app data | 🚫 |

## Application Support — `~/Library/Application Support/*`

Real app data, **not** cache. Do not `rm` blindly.

| Path pattern | Notes | Risk |
|--------------|-------|------|
| Messaging apps (Signal/WhatsApp/Telegram) | Received media, often GBs — real data | ⚠️ in-app "clear media" only |
| Browser profiles (Firefox/Chrome/Google) | Bookmarks, sessions, extensions | ⚠️ profile data, not cache |
| Editor state (Code/Cursor/JetBrains) | Settings, workspace storage | ⚠️ |

## Dev project bloat

| Target | How to reclaim | Risk |
|--------|----------------|------|
| `node_modules` in inactive projects | `find ~/path -name node_modules -type d -prune` then remove; restore via `install` | ⚠️ regenerable but needs reinstall |
| `.venv` / `venv`, `target/`, `dist/`, `build/` | Regenerable build/output dirs | ⚠️ |
| Vendored/lockfile-restorable dirs | Safe if lockfile is committed | ⚠️ |

## Backups & cloud — usually 🚫

| Path | What it is | Risk |
|------|------------|------|
| `~/Library/Application Support/MobileSync/Backup` | iPhone/iPad backups — can be huge | ⚠️ delete only via Finder/iTunes after confirming |
| `~/Library/Mobile Documents` | iCloud Drive local copy | 🚫 |
| `~/Library/Keychains` | Credentials | 🚫 |
| `~/Library/Group Containers` (with real data) | Shared app data (Notes, iWork, etc.) | 🚫 |

## Startup / background — inspect, rarely remove

| Location | What it is |
|----------|------------|
| `~/Library/LaunchAgents` | Per-user startup agents (e.g. `com.google.keystone.*` = Chrome updater) |
| `/Library/LaunchAgents`, `/Library/LaunchDaemons` | System-wide 3rd-party agents/daemons |
| `System Settings → General → Login Items` | GUI list of login items & background allowances |

Only disable a login item/agent you can attribute and the user wants gone (`launchctl bootout` / toggle in System Settings). **Never** disable MDM, VPN, or endpoint-security agents on a managed machine.
