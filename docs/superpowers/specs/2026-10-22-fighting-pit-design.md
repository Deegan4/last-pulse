# Last Pulse — Fighting Pit (v2.77.0) Design

Date: 2026-10-22  
Status: approved in chat; awaiting spec review before implementation plan

## Goal

Make the in-progress brawler rewrite (flat side-view pit + melee weapons) feel
like an intentional arena game, not a stripped top-down Horde mode. Ship one
cohesive player-visible pass as **v2.77.0** that adds pit presence, mid-run
wave pressure, and clear wave goals — then document the melee/pit rewrite in
`CHANGELOG` so returning players see what changed.

## Context

Phases 1–2 already landed on `main` without a version bump:

- Arena is `ARENA_W×ARENA_H = 2200×640` (flat pit, not a scrolling stage).
- `buildDecor()` clears obstacles/interactables; `escalateMap()` is a no-op.
- `WEAPONS` is melee-only (Fists…Sledgehammer); combat is `attack()` / `slashes[]`.
- Horde wave loop (`hordeUpdate` → perk pick / `hordeSpawnWave`) still drives sessions.
- Maps still pick ground + time-of-day only (background palette).

Old roadmap ideas (buildings, towers, gun DPS) are out of scope for this pass.

## Non-goals

- Restoring buildings, cover, watchtowers, or shootable props.
- Restoring guns / ranged player weapons.
- Reviving Battle Royale or Squads.
- Online multiplayer, Meshy, or App Store Connect IAP product creation.
- Variable camera zoom or co-op leash retune.

## Approach (chosen)

**Brawler Phase 3 — pit presence + wave goals** over retention-only coins or
blind melee balance tweaks. Dressing alone leaves the loop repetitive; events
alone leave the pit looking unfinished; balance without a phone is guesswork.

## Architecture

No new systems boundary. Extend existing units in the shared IIFE scope
(`src/game/…`, built by `scripts/build-game.py`):

| Concern | Primary file(s) |
|---|---|
| Pit backdrop draw | `src/game/rendering/world.js` (`drawField`) |
| Wave rush event | `src/game/progression/waves-results.js` (`hordeSpawnWave` / `hordeUpdate`) + light state in `src/game/core/state.js` |
| Milestone coins + toast | `waves-results.js` (on clear) and `showResults()` (sum display) |
| Version / What’s New | `src/game/data/releases.js` + `ROADMAP.md` header |
| Design log | `memory.md` bullet |

Collision, pathing, and `obstacles[]` stay empty. Set dressing is **draw-only**.

## Components

### 1. Pit set dressing (non-blocking)

In `drawField()`, after the ground fill and before/alongside the existing border stroke:

- **Floor band** — a slightly darker horizontal strip along the bottom ~18% of
  `ARENA_H` so the stage reads as a fighting floor vs. a floating texture.
- **Side walls** — tall vertical panels on the left and right edges (inside the
  arena rect), with a simple depth shade; no collision.
- **Entrance gates** — two marked openings on the left/right walls at mid-height
  where `edgeSpawn()` already places entrants, so rush waves visually “come from
  the gates.”

Drawing stays world-space (camera-aware via existing `cam`). No particles required
for v1; optional dust on rush start can reuse `spark()` if cheap.

### 2. Wave rush event (“BOTH SIDES!”)

**Trigger:** when advancing to wave **4, 8, or 12**, and the wave is **not** a
boss wave (`boss` is false). Boss waves remain 5 / 10 / 15… and must not double
up with a rush.

**Behavior:**

1. Toast: `⚔ BOTH SIDES!` (or equivalent short copy) + `sfx('warn')`.
2. For `RUSH_DUR` seconds (default **6**), spawn extra zombies from **both**
   edges on a short cadence (`RUSH_INTERVAL` default **0.55s**), each spawn
   using `edgeSpawn()` then `makeZombie` + `hordeScale` for the current wave.
3. Cap concurrent extras per tick (`RUSH_PER_TICK` default **2**, one preferred
   per side when possible) so mobile frames stay healthy.
4. Rush spawns are **in addition to** the normal `hordeSpawnWave` pack for that
   wave — the clear condition remains “all zombies dead.”
5. **Perk overlap:** wave 12 is also a perk-pick wave (`hordeWave % 3 === 0`).
   Rush starts inside `hordeSpawnWave`, which only runs after `choosePerk()` —
   not during the modal. No special case required.

**State:** module-level `rushT` (countdown) and maybe `rushCd` (interval timer)
in `state.js`, ticked from `hordeUpdate` (or the main sim tick that already
calls it) while `grace<=0` and a match is live. Reset `rushT=0` in `spawnMatch`.

**Mutators:** apply `activeMutator?.zMul` the same way `hordeSpawnWave` does when
counting extras, or leave rush counts unscaled — **decision: apply `zMul`** so
Swarm Night stays coherent.

### 3. Wave milestone rewards

On the frame a wave is cleared and `hordeWave` becomes **5, 10, or 15**
(i.e. the clear that *reaches* that wave number — same moment the toast/wave
banner fires):

| Wave reached | Bonus coins |
|---|---|
| 5 | 25 |
| 10 | 50 |
| 15 | 100 |

- Grant immediately into `meta.coins` + `saveMeta()`, toast the bonus, `sfx('level')`.
- Track `matchStat.milestoneCoins` (or a local `milestoneCoins` in the match) so
  `showResults()` can include the sum in the unlock banner without double-granting.
- Only once per threshold per match (idempotent if somehow re-entered).

Waves above 15 do not add further automatic milestones in this pass (keeps scope
tight; weekly/daily already cover long-run goals).

### 4. Version / docs honesty

- Set `GAME_VERSION = '2.77.0'`.
- Prepend `CHANGELOG` entry covering: fighting-pit presentation, BOTH SIDES
  rushes, wave milestone coins, and that the game is now melee-in-a-pit (phases
  1–2 finally announced).
- Sync `ROADMAP.md` header to `v2.77.0` and add a short shipped checklist for
  this pass.
- Add a `memory.md` bullet under Current state.

## Data flow

```
wave clear (aliveZ==0)
  → hordeWave++
  → if wave in {5,10,15}: grant milestone coins + toast
  → if perk wave: openPerkPick(boss); return
  → hordeSpawnWave(boss)
       → if wave in {4,8,12} && !boss: start rushT = RUSH_DUR
  → each frame hordeUpdate: while rushT>0, tick cadence, edgeSpawn extras
```

Results screen reads career `meta` and match `milestoneCoins` for display only
(grants already applied mid-match).

## Error handling / safety

- Rush and milestones no-op when `screenState !== 'playing'` or match already
  `ended`.
- Empty `obstacles` remains safe; dressing never pushes into `obstacles[]`.
- Spawn positions stay `clamp`ed via `edgeSpawn()`; no `blockedSpawn` needed in
  the bare pit.
- Headless / WebAudio suspended: toasts still show; SFX fail soft as today.

## Testing / verification

1. `python3 scripts/build-game.py` (and `--check` freshness).
2. `node scripts/validate.mjs` (version coherence gate).
3. `node .claude/skills/run-brawl-arena/driver.mjs --play --shoot` — no page errors;
   visual check of pit walls/floor in `.shots/`.
4. Optional: throwaway hooks on a copy to force `hordeWave=3` clear → confirm rush
   at 4; force clear to 5 → confirm +25 coins once; delete hooks (no `window.__`
   in committed sources).
5. `driver.mjs --waves 15 --runs 1` if available — smoke that rushes don’t explode
   entity counts into a hang (soft cap via interval + per-tick count).

## Tunables (defaults)

| Knob | Default | Suggested playtest range |
|---|---|---|
| `RUSH_DUR` | 6.0 s | 4–8 |
| `RUSH_INTERVAL` | 0.55 s | 0.4–0.8 |
| `RUSH_PER_TICK` | 2 | 1–3 |
| Rush waves | 4, 8, 12 | keep off boss multiples of 5 |
| Milestone coins | 25 / 50 / 100 | ±50% if economy feels rich |

## Success criteria

- A cold boot into a match shows a readable pit (floor + side walls + gates), not
  a bare textured rectangle.
- Waves 4/8/12 announce and visibly feed from both gates for ~6s.
- Reaching waves 5/10/15 grants the listed coins once and surfaces on results.
- What’s New popup for 2.77.0 explains the melee pit direction.
- Validate + driver smoke pass with zero page errors.

## Implementation order (for the later plan)

1. State + rush tick + spawn wiring.
2. Milestone grants + results accounting.
3. `drawField` pit dressing.
4. Version / ROADMAP / memory / build outputs.
5. Validate + driver evidence.
