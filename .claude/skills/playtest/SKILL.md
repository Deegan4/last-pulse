---
name: playtest
description: Validate BRAWL ARENA.html — parse-check the script block, then optionally launch headless Chromium for a few seconds and capture a screenshot plus console log. Use after non-trivial gameplay edits, before claiming a feature works, or when chasing a runtime regression that "looks fine in the editor".
---

# Playtest

A lightweight verify loop for the single-file game.

## When to use

- After editing `BRAWL ARENA.html` and before reporting the work as done.
- When the user reports "X is broken" — capture a fresh screenshot first to confirm symptoms.
- When tuning balance — record a CPU-vs-CPU sample to see what the change feels like in motion.

## What's bundled

- `scripts/parse-check.mjs` — parses the script block with `vm.Script` (no execution). Same check the PostToolUse hook runs, exposed here for explicit calls.
- `scripts/headless-play.mjs` — uses `puppeteer-core` or falls back to the Playwright MCP if installed. Loads the file, waits a beat, snaps a PNG and dumps console output.

## Workflow

1. **Parse**: run `node .claude/skills/playtest/scripts/parse-check.mjs` — fails fast on syntax errors with a clear line/column.
2. **Render**: if Playwright MCP is connected, use the `browser_navigate` + `browser_take_screenshot` tools against `file://` of the HTML. Otherwise run `node .claude/skills/playtest/scripts/headless-play.mjs` (requires `npx puppeteer-core` to be reachable; install Chromium-bundled Puppeteer with `npm i -g puppeteer` if you want a one-liner).
3. **Inspect**: read the captured PNG with the Read tool to verify visually. Read the captured console log to surface runtime errors.
4. **Report**: if any error fires or the screenshot looks wrong, hand back a one-paragraph diagnosis with the suspect file path and line — don't loop.

## Output locations

- Screenshot: `.claude/skills/playtest/out/last.png`
- Console log: `.claude/skills/playtest/out/last-console.txt`

The `.claude/skills/playtest/out/` directory is gitignored — these are throwaway artifacts.

## Failure modes to handle without panicking

- `WebAudio` cannot start without a user gesture in headless mode — the menu state should still render. Don't treat "audio context suspended" warnings as failures.
- The Gamepad API returns an empty list in headless Chromium — that's expected; the game falls back to keyboard.
- `localStorage` works in headless Chromium for `file://` origins on most platforms but not all — the game's `safeGet`/`safeSet` wrappers swallow this.
