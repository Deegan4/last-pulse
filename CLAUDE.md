# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

Single-file HTML5 canvas fighting game (Smash-Bros-style 1v1, vs CPU or local 2P). No build system, no package manager, no test suite. The entire game — markup, styles, and logic — lives in [BRAWL ARENA.html](BRAWL ARENA.html) (~1560 lines). `maxresdefault.jpg` is unused art reference. GitHub remote: <https://github.com/Deegan4/brawl-arena>.

## Running / Iterating

Open the HTML file directly in a browser — there is no build step or dev server.

```sh
open "BRAWL ARENA.html"           # macOS default browser
# or serve locally if testing mobile devtools:
python3 -m http.server 8000
```

Mobile touch controls auto-activate when `matchMedia('(hover: none) and (pointer: coarse)')` matches or UA contains a mobile token. To test the mobile path on desktop, use Chrome devtools device emulation.

### Validation

After any non-trivial edit:

```sh
node .claude/skills/playtest/scripts/parse-check.mjs   # syntax-checks the <script> block
```

The PostToolUse hook in `.claude/settings.json` runs the same check automatically on every Edit/Write to `BRAWL ARENA.html` and blocks with a parse error message if the script no longer parses.

## Architecture

Everything is one IIFE inside `<script>` at the bottom of the HTML. Section banner comments (`// ---------- X ----------`) mark the major regions and are the primary navigation aid — preserve them when editing.

Pipeline (top-down in the file):

1. **Canvas setup** — DPR-aware sizing, rebinds on `resize` / `orientationchange`.
2. **World** — `GRAV`, `FLOOR_Y()`, `platforms()` returns 4 platforms relative to viewport. `PLATS` is recomputed on resize, so anything reading platform geometry must read `PLATS` each frame (don't cache).
3. **Input** — Inputs merge into two structs, `input.p1` and `input.p2`. Sources: keyboard (`keys` map), a virtual joystick (`touchVec`), the four touch buttons, and gamepad slots 0–3 (`gpFrame[0..3]`, polled once per frame at the top of `loop()` so subsequent reads in `updateFighter` are stable). The `_jPress`/`_aPress`/`_sPress` "edge" flags are set on press and consumed (`= false`) inside `updateFighter` — preserve this consume-on-read pattern when adding new inputs. In `'2p'` mode P1 ignores arrow keys so P2 can use them; that gate is at the top of the `control === 'p1'` branch.
4. **Fighter** — `makeFighter()` is the canonical fighter shape; `P1` and `P2` are the only two instances. P2 is dispatched as `updateFighter(P2, P2.isAI ? 'ai' : 'p2')` — the `control` arg switches input source inside `updateFighter`, so AI logic lives alongside player logic, not in a separate module. AI difficulty is `settings.difficulty` (`'easy' | 'normal' | 'hard'`) and tunes attack/jump/shield probability, reach, and smash-threshold inside the `'ai'` branch.
5. **Combat data model (`MOVES`)** — All 12 attacks (`jab`, `ftilt`/`utilt`/`dtilt`, `fsmash`/`usmash`/`dsmash`, `nair`/`fair`/`bair`/`uair`/`dair`) are entries in the `MOVES` table with `startup/active/recover` frame timing, hitbox offsets (`dx`/`dy`/`w`/`h` relative to fighter center, mirrored by `facing` unless `bothSides`), launch angle (auto-mirrored by `facing`), damage, base knockback, and KB scaling. `selectMove()` picks the entry from current `mx`/`my` and `onGround`. `hitboxFor()` and `applyHits()` both read from this table — to add a move, add an entry and `selectMove` will pick it up. The `balance-reviewer` subagent in `.claude/agents/` reads this table to flag outliers.
6. **Effects / Audio** — Three independent capped pools share the draw loop: `spark()` → `particles[]` (debris), `pushRing()` → `rings[]` (expanding stroked impact circles, attacker-tinted via `hexToRgba`), and `pushGhost()` → `trailGhosts[]` (semi-transparent silhouette streaks dropped during heavy knockback). Each pool has a hard cap (`RING_MAX`, `GHOST_MAX`) enforced inside its push helper, and all three are cleared in `startGame()`. Audio is a lazy WebAudio synth (`audioInit()` is called from the Start button click to satisfy autoplay policy); `tone()` and `noise()` are fire-and-forget. Master gain is scaled by `settings.sfxVol` and live-updates via `applySfxVol()`.
7. **Game state** — `gameState` is `'menu' | 'playing' | 'end'` and a separate `paused` boolean gates fighter updates while the pause modal is open (the canvas still redraws each frame). `gameMode` (`'cpu' | '2p'`) decides whether P2 is AI or human and is persisted via `safeGet`/`safeSet` localStorage wrappers (raw `localStorage` access can throw inside sandboxed previews — always go through the wrappers). The HUD is plain DOM (`#pct1`, `#stocks1`, etc.) updated each frame by `refreshHud()`, not drawn on the canvas. Settings (stocks, difficulty, SFX volume, shake, hitbox debug) live on a `settings` object and feed `makeFighter`, `doShake`, the AI block, and the audio master gain.
8. **Physics** — `landOnPlatforms(f, prevY)` does swept top-of-platform collision using the previous frame's Y; if you change movement integration, also update what's passed as `prevY`. `applyKnockback(target, dmg, angle, base, scaling, attacker)` is the smash-style percent-scaled launch formula; it also spawns the impact ring (tinted by `attacker.color`), so pass the attacker through. `hitboxFor()` returns the active attack AABB; `applyHits()` is called twice per frame (P1→P2, P2→P1).
9. **Draw** — Order matters and is layered for visual punch: parallax background (`drawStars`/`drawClouds`/moon, all offset by `bgParallax(depth)` which tracks the fighters' average X) → platforms → trail ghosts (behind fighters) → fighters → particles → impact rings (above particles) → flash overlay. Screen shake is applied via `ctx.translate(shx, shy)` around the whole world draw, inside a `save`/`restore`. `drawFighter()` layers cosmetic-only animation on top of the AABB: idle breathing/arm sway when calm+grounded (`attackTimer === 0 && hitstun === 0 && onGround && knockoutAnim === 0`), a hit-react tilt + white flash scaled from `hitstun`/`vx`, and a torso `damageTint(color, pct)` that shifts toward orange as percent climbs. None of these change `f.x/f.y/f.w/f.h`. `bgParallax`, `drawStars`, and `drawFighter` all guard against `P1`/`P2` being undefined so the background still renders on the menu/end screens.
10. **Main loop** — Single `requestAnimationFrame(loop)` chain. `hitStop` freezes updates (not draws) for impact frames; `shake` and `flashTimer` decay each frame.

### Coordinate / scaling notes

- Logical coordinates are CSS pixels; `ctx.setTransform(DPR, …)` in `resize()` is what makes the canvas crisp. Don't multiply by `DPR` manually when drawing.
- Most layout constants are viewport-relative (`W*0.35`, `H*0.78`). When adding entities, keep them relative so the game stays playable across phone/desktop without a resize handler.

### Input edge-trigger pattern

Press-once actions (jump, attack, smash) use a paired `keys[...] && !prev` style via the `_jPress` flag set in keyboard/button handlers and cleared inside `updateFighter`. Continuous actions (movement, shield hold) read the live state directly. Mirror this split when extending controls.

## Project automation

- **Hook** — `.claude/settings.json` runs `.claude/scripts/post-edit-parse-check.mjs` after every `Edit`/`Write`/`MultiEdit`. The hook only acts when the edited path ends in `BRAWL ARENA.html`; on parse failure it blocks with a `{decision:"block", …}` message so the editing session self-corrects before reload.
- **Skill** — `/playtest` (defined in `.claude/skills/playtest/SKILL.md`) wraps the parse-check plus a headless Chromium screenshot. Output goes to gitignored `.claude/skills/playtest/out/`.
- **Subagent** — `balance-reviewer` (`.claude/agents/balance-reviewer.md`) reads the `MOVES` table and flags outliers (off-envelope damage/KB, frame-budget mismatches, misplaced `spike` flags). Read-only.
- **MCP servers** — `.mcp.json` declares Playwright and GitHub MCPs at project scope. They're picked up when Claude Code starts in this repo (with `enableAllProjectMcpServers: true` in `settings.json`).
