---
name: mac-maintenance
description: "Safe, scan-first macOS maintenance — inventory disk usage, updates, caches and startup items read-only, report what is reclaimable, then clean/upgrade ONLY what the user approves. Use when the user asks to clean up, speed up, do maintenance on, or free disk space on their Mac, or to find what to update or uninstall. Triggers: 'clean up my mac', 'free up disk space', 'system maintenance', 'speed up my mac', 'what can I uninstall', 'what needs updating', 'údržba systému', 'projdi mi mac', 'uvolnit místo', 'zrychlit systém', 'co aktualizovat', 'co odinstalovat'."
---

# macOS Maintenance

Scan-first maintenance for any Mac: find what is safe to update, clean, or remove — then act **only** on what the user explicitly approves. The whole point is to be safe on someone's primary machine, so the scan is read-only and every destructive step is gated behind confirmation.

## Golden rules

1. **Scan read-only first, report, then ask.** Never delete, uninstall, or upgrade before the user has seen a findings report and chosen what to run. Present a report → let the user pick → execute only the picks.
2. **Never guess at destructive scope.** For anything with possible data loss (Docker volumes, `node_modules`, app data, backups) show what would be lost *before* touching it.
3. **Respect managed / corporate machines.** If MDM, VPN, or remote-support agents are present (see "Managed machines"), do not disable or remove them, and flag major OS upgrades as "coordinate with IT" rather than running them.
4. **Measure before and after.** Capture free space before cleanup and report the actual reclaimed total afterward — don't estimate when you can measure.
5. **Big OS upgrades are the user's call.** Never kick off a macOS major-version upgrade automatically. List it, explain the restart, let them do it deliberately.

## Phase 1 — Scan (read-only)

Run these in parallel; none of them modify anything. Adjust `head` limits to taste.

```bash
# System + hardware + real uptime
sw_vers; sysctl -n hw.model machdep.cpu.brand_string; echo "RAM bytes: $(sysctl -n hw.memsize)"; uptime

# TRUE free space — see "Pitfalls": df -h / lies on modern macOS
diskutil info / | grep -iE "Container (Total|Free) Space"
df -h /System/Volumes/Data | tail -1

# Biggest folders in HOME
du -sh "$HOME"/* 2>/dev/null | sort -rh | head -25

# The usual space hogs
du -sh "$HOME/Library/Caches" "$HOME/Library/Logs" \
       "$HOME/Library/Application Support" "$HOME/Library/Containers" 2>/dev/null | sort -rh
du -sh "$HOME/Library/Caches"/* 2>/dev/null | sort -rh | head -15
du -sh "$HOME/Library/Application Support"/* 2>/dev/null | sort -rh | head -15
du -sh "$HOME/Library/Containers"/* 2>/dev/null | sort -rh | head -10

# Updates available
brew outdated 2>/dev/null; brew list --cask 2>/dev/null
softwareupdate --list 2>&1 | head -20          # can take ~30–60s, hits Apple servers
command -v mas >/dev/null && mas outdated       # App Store apps, if mas is installed

# Startup / background load & apps
ls -1 "$HOME/Library/LaunchAgents" /Library/LaunchAgents /Library/LaunchDaemons 2>/dev/null
ls -1 /Applications "$HOME/Applications" 2>/dev/null

# Trash + Docker VM disk (a very common silent hog)
du -sh "$HOME/.Trash" 2>/dev/null
du -sh "$HOME/Library/Containers/com.docker.docker" 2>/dev/null
```

See `references/cleanup-targets.md` for the full catalog of what each path is and how risky it is to clear.

## Phase 2 — Report

Summarize findings as a scannable report, grouped by category. Sort space hogs largest-first and tag each with a risk level:

- ✅ **Safe** — regenerates automatically (caches, logs). Clear freely when the owning app is closed.
- ⚠️ **Needs decision** — real data loss possible (Docker volumes, `node_modules`, app media, device backups).
- 🚫 **Don't touch** — system, managed-machine agents, keychains, iCloud data.

Also list: available updates (Homebrew / macOS / App Store), and — if asked — uninstall candidates (see below). End with a rough "reclaimable: ~X GB safe / ~Y GB total" and ask which categories to run. Prefer a multiple-choice prompt so the user can pick batches.

## Phase 3 — Clean / update (only what was approved)

Confirm which IDEs / apps are closed before clearing their caches, then act. Delete the *contents/dirs* under `~/Library/Caches`; apps recreate them.

```bash
# App / dev caches (safe; close the owning app first) — pick only approved ones
rm -rf "$HOME/Library/Caches/JetBrains" "$HOME/Library/Caches/Yarn" \
       "$HOME/Library/Caches/ms-playwright" "$HOME/Library/Caches/electron" \
       "$HOME/Library/Caches/typescript" "$HOME/Library/Caches/node-gyp"

# Package-manager caches (prefer the tool's own command)
brew cleanup                    # frees old versions + download cache
yarn cache clean 2>/dev/null
npm cache clean --force 2>/dev/null
pnpm store prune 2>/dev/null
pip cache purge 2>/dev/null
go clean -cache 2>/dev/null
rm -rf "$HOME/Library/Developer/Xcode/DerivedData"/* 2>/dev/null   # Xcode only

# Updates — see Pitfalls about dependent upgrades (e.g. mysql)
brew upgrade                    # or an explicit list to hold risky formulae
mas upgrade 2>/dev/null
```

**Deleting large caches is slow** — a Yarn or JetBrains cache is millions of tiny files. Run the `rm` in the background and poll for the process to finish + track `diskutil info /` free space, rather than blocking on one call.

### Docker (frequently the single biggest reclaim)

`Docker.raw` grows and **never shrinks by itself**. With Docker Desktop running:

```bash
docker system df                 # show images / containers / volumes / build cache
docker system prune              # remove dangling/unused (keeps named volumes)
docker system prune -a --volumes # aggressive — DELETES unused images AND volumes
```

Always show `docker system df` and confirm before `prune -a --volumes` — named volumes may hold databases the user cares about.

### Uninstall candidates

Don't guess "unused". Rank by last-opened date, then let the user choose:

```bash
mdls -name kMDItemLastUsedDate -name kMDItemDisplayName /Applications/*.app 2>/dev/null
```

For Homebrew casks/formulae, `brew uninstall <name>` then `brew autoremove` to drop orphaned deps. Never remove an app you can't attribute to the user (bundled/system/managed apps).

## Managed machines — do not disable

If any of these appear in `/Library/LaunchDaemons` / `/Library/LaunchAgents` or `/Applications`, treat the Mac as corporate-managed: **leave the agent alone** and don't remove its app. Flag OS upgrades as "coordinate with IT."

- MDM / endpoint mgmt: `com.manageengine.*`, `com.jamf.*`, `com.microsoft.intune.*`, `jamf`
- VPN: `com.cisco.anyconnect.*`, `com.paloaltonetworks.GlobalProtect.*`
- Remote support: TeamViewer, AnyDesk
- Corporate updaters/security: `com.microsoft.*`, CrowdStrike, SentinelOne

## Pitfalls (learned the hard way)

- **`df -h /` reports the sealed, read-only System volume** (~a few GB) on modern macOS — it is NOT your free space. Use `diskutil info /` → *Container Free Space*, or `df` against `/System/Volumes/Data`.
- **`brew upgrade` drags in dependents.** Upgrading e.g. `openssl@3` / `protobuf` makes brew try to upgrade `mysql` too. To hold a risky package (DB data-dir migration), `brew pin <formula>` first, or pass an explicit upgrade list. Always verify the actually-installed version afterward (`brew list --versions mysql`) — brew's summary can announce an upgrade it then skips.
- **High load average right after boot is normal** — Spotlight (`mds`/`mdworker`) is indexing. Re-check after a few minutes before calling it a performance problem.
- **Docker.raw never auto-shrinks** — reclaiming space needs `docker system prune` or resetting the disk image from Docker Desktop.
- **Cache size ≠ instant reclaim.** After deleting huge dirs, free space climbs gradually; poll `diskutil info /` instead of expecting it at once.
- **Messaging apps (Signal/WhatsApp/Telegram) store received media** under Application Support — often GBs. It's real data, not cache; only remove via the app's own "clear media", never with `rm`.

## When NOT to use this skill

- **Not macOS** (Linux/Windows) — the paths and tools (`diskutil`, `softwareupdate`, `brew`, `mdls`) are macOS-specific.
- **Malware / security incident** — this is housekeeping, not a security audit or IR.
- **The user wants a specific one-off action** they already named (e.g. "just run `brew upgrade`") — just do that; don't run the full scan ceremony.

## After running

Report: what was actually deleted/upgraded (with sizes), the measured free-space delta (before → after), what was intentionally left (and why), and any follow-ups the user declined so they can revisit later.
