---
name: run-brawl-arena
description: Build, launch, drive, and screenshot the "Don't Die — Battle Royale" canvas game headlessly. Use when asked to run, start, launch, play, smoke-test, screenshot, or verify the brawl-arena game (index.html) — drives the real running app into a live match and checks for console/runtime errors.
---

# Run: Don't Die — Battle Royale

A single-file HTML5 canvas game — the whole app (markup, styles, logic) is `index.html`.
**No build step, no dev server, no package manager.** It loads over `file://`.

There is no `chromium-cli` in this container, so the driver is a small Playwright script,
[`.claude/skills/run-brawl-arena/driver.mjs`](driver.mjs), that launches the **bundled
Chromium** at portrait phone size, optionally clicks through the menus into a live match,
screenshots each stage, and **exits non-zero if the page logs any error**. It auto-resolves
Playwright from the container's global `node_modules` and finds the Chromium binary itself —
no install needed here.

All paths below are relative to the repo root (`<unit>/`). Run everything from there.

## Prerequisites

Nothing to install in this container — it already ships:
- the bundled Chromium under `/opt/pw-browsers/chromium-*/chrome-linux/chrome`
- the global `playwright` module under `/opt/node22/lib/node_modules` (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` is preset)

The driver discovers both at runtime. On a bare machine you'd instead
`npm i -D playwright && npx playwright install chromium`; override the binary with
`CHROME_BIN=/path/to/chrome` if it lives elsewhere.

## Build

None. It's a static file. The only "build" gate is a syntax parse-check of the `<script>` block:

```bash
node scripts/validate.mjs
# OK — 1 script block(s) parse, 1526 lines
```

## Run (agent path — the driver)

Boot the game and screenshot the start screen (also the fastest smoke test — fails on any
console/runtime error):

```bash
node .claude/skills/run-brawl-arena/driver.mjs
```

Drive all the way into a **live match** and screenshot gameplay. `--mode` is `br` (default),
`horde`, or `squad`:

```bash
node .claude/skills/run-brawl-arena/driver.mjs --play --mode horde
node .claude/skills/run-brawl-arena/driver.mjs --play --mode br
```

To screenshot **combat juice** (muzzle flash, tracers, casings, LOW AMMO / reload), add
`--shoot`: after the GET READY grace the driver holds fire and sweeps the aim across the field.
`--seconds` sets how long it fires (default 3.0):

```bash
node .claude/skills/run-brawl-arena/driver.mjs --play --mode horde --shoot --seconds 4
```

Screenshots land in `./.shots/` (gitignored): `01-start.png`, `02-weapon.png`, `03-match.png`.
**Open `03-match.png` and actually look at it** — a blank field or a stuck "GET READY" banner
means the run is wrong even if the process exited 0. With `--play` the driver also prints the
live HUD as a sanity check, e.g.:

```
  HUD: {"players":"8","lblPlayers":"zombies","safe":"1","lblSafe":"Wave","kills":"0","fps":"60"}   # horde
  HUD: {"players":"15/15","lblPlayers":"players","safe":"39s","lblSafe":"Safe area:","kills":"0","fps":"25"} # br
```

Useful flags: `--shoot` (hold-fire + sweep aim), `--seconds <n>` (fire/wait duration),
`--out <dir>` (screenshot dir), `--file <path>` (alternate `index.html`),
`--keep-open` (leave the browser running for debugging).

The driver clicks the **explicit** menu buttons in order —
`#nameInput` → `[data-mode=…]` → `#toAvatarBtn` (Play) → `#toWeaponBtn` (Continue) →
`#dropInBtn` (Drop In) — then waits past the ~2.6 s "GET READY" grace before the gameplay shot.

## Run (human path)

Open `index.html` in any browser, or serve it: `python3 -m http.server 8000` →
`http://localhost:8000`. Useless headless (you can't see or touch the canvas), which is the
whole reason the driver exists.

## Gotchas

- **No `chromium-cli`.** Drive via the bundled Chromium + global Playwright; the driver resolves
  both. Don't run `playwright install` — the browser is already at `/opt/pw-browsers`.
- **`import('playwright')` fails from this repo** (no local install, empty `NODE_PATH`). The
  driver works around it by deriving the global `node_modules` from `process.execPath`
  (`…/bin/node` → `…/lib/node_modules`). If you write your own script, do the same or set
  `NODE_PATH=/opt/node22/lib/node_modules`.
- **Avoid the settings gear.** `#avatarGear` / `#weaponGear` open a modal that swallows the
  flow; naive "click the last visible button" loops land on it. Use the explicit Play /
  Continue / Drop In button IDs (the driver does).
- **Default avatar & weapon are preselected** from `localStorage` (`meta.avatar` / `meta.weapon`,
  default 0/0), so Continue and Drop In work without clicking a grid cell.
- **Headless FPS under-reads.** Software rendering (`--disable-gpu` / swiftshader) shows ~25–60
  FPS here; it's a pessimistic lower bound, not the on-device number, and not a failure.
- **No audio in headless.** WebAudio stays suspended without a real user gesture — expected.
- **`file://` is enough.** No dev server needed; the game is one self-contained file.

## Troubleshooting

- `index.html not found at …` — run from the repo root, or pass `--file ./index.html`.
- `Could not load Playwright. Tried: …` — set `NODE_PATH=/opt/node22/lib/node_modules`, or run
  on a machine where `npx playwright install chromium` has been done.
- Match shot shows the **start screen**, not gameplay — a menu button id changed; re-check
  `#toAvatarBtn` / `#toWeaponBtn` / `#dropInBtn` against `index.html`.
- Browser fails to launch with a missing `lib*.so` — install it with `apt-get install -y <lib>`
  (didn't occur in this container; the bundled Chromium's deps are present).
