# Last Pulse — True 3D High-Angle World Design

Date: 2026-10-23

## Goal

Replace the 2D canvas playfield with a **true Three.js 3D world** using a
**fixed high-angle tactical camera** (~55–65° pitch, slight yaw), so the game
reads as a 3D twin-stick survival title while keeping Endless Horde gameplay,
portrait mobile-first controls, and the existing HTML menu shell.

**Hard constraint:** **no Meshy**. Procedural low-poly Three.js geometry only.
Meshy generation (`scripts/gen-meshy.mjs`, remaining queued GLBs, playfield
billboard blit) is out of scope and will be retired from the play path. Existing
GLBs under `assets/meshy/` may remain on disk for archival/viewer use but must
not be required to run or ship the game.

## Decisions (locked with owner)

| Choice | Decision |
|---|---|
| World model | True 3D (not fake isometric skew, not billboard blit) |
| Camera | High-angle tactical (~60° pitch, ~15° yaw), orthographic |
| Fallback | **3D-only** — if WebGL fails, show a hard error; no 2D world |
| Art | Procedural low-poly Three.js meshes |
| Architecture approach | **Full rewrite** of sim + render onto Three.js entities |
| Meshy | Explicitly abandoned (cost) |

## Non-goals (v1)

- Meshy / external text-to-3D pipelines
- Skeletal animation / Mixamo / walk-clip retargeting
- Dynamic zoom for co-op (keep today’s midpoint follow + leash)
- Online multiplayer / netcode
- Photoreal materials or baked lightmaps
- Replacing DOM menus with 3D UI

## Approach

Rewrite gameplay simulation and rendering so entities are `THREE.Object3D`
graphs living in a single WebGL scene. Simulation uses world **XZ** (Y up).
Combat, horde waves, zone, abilities, audio, and progression logic are
preserved in behavior and tunables; their coordinate reads/writes move from
legacy `x,y` canvas space to `position.x/z`.

Rejected alternatives (discussed with owner):

1. **Keep 2D sim, replace renderer only** — lower risk, but leaves a dual
   mental model; owner chose full rewrite.
2. **Dual-canvas hybrid (WebGL world + 2D VFX)** — conflicts with 3D-only.
3. **Meshy-backed GLB roster** — blocked on cost; abandoned.

## Architecture

### Layers

1. **DOM shell** — start/avatar/weapon/settings/results modals stay HTML/CSS.
2. **Game core** (`src/game/core/*`, combat, AI, world, progression) — same
   systems, XZ sim, entities hold mesh references.
3. **Scene / render** (new + rewritten `src/game/rendering/*`) — `THREE.Scene`,
   OrthographicCamera, lights, procedural mesh factories, dispose on death.
4. **Vendored Three.js** — `assets/vendor/three/` (r169 already local; no CDN).

### Coordinate contract

- Ground plane: `y = 0`.
- Entity feet at `y = 0`; horizontal motion on `x,z`.
- Legacy names: treat old `entity.y` as **world Z** during migration (or rename
  to `z` in one pass — prefer explicit `x`/`z` fields to avoid confusion).
- Collisions, zone radius, building footprints: 2D tests on XZ.
- Aim: yaw around Y; gun tip is a child transform on the wrist group.

### Camera

- `THREE.OrthographicCamera`, portrait frustum sized from stage `W×H`.
- Default: pitch **60°**, yaw **15°** (tunable consts `CAM_PITCH` / `CAM_YAW`).
- Follow player (or P1–P2 midpoint); clamp so arena edges stay framed like
  today’s `cam` clamp.
- Mouse aim: raycast from pointer through camera onto `y=0` plane.

### WebGL failure

On renderer construction failure: hide game canvas, show a full-screen
“WebGL required” panel. Do **not** fall back to the old 2D draw path.

## Components

### Procedural art kit

| Kind | Construction |
|---|---|
| Ground | Large plane + flat/noise material; biome tint hooks later |
| Buildings | Box groups (body, roof slab, door recess) for house/shop/barn/cabin footprints already in `buildDecor` |
| Humans | Capsule/sphere chibi (head, torso, limbs); colors from avatar `look`; gun as box group on wrist, rotated by aim yaw |
| Zombies | Same kit; kind silhouette via scale + extra boxes (brute mass, stalker lean, etc.); **stats unchanged** |
| Projectiles / VFX | Short-lived meshes + simple particle sprites; keep data arrays (`particles`, `floaters`, `zaps`) but draw in Three.js |
| Zone | Ground ring / cylinder outline matching current safe-area radius |

### Entity lifecycle

- `makeHuman` / `makeZombie` / decor builders create sim state **and** mesh
  group; add to scene.
- `die` / despawn / match teardown: remove from scene and `dispose()` geometries
  and materials to avoid GPU leaks on Horde wave churn.
- Bots and player share the same human proxy factory.

### Input

- Touch joysticks unchanged in UI; vectors map to XZ velocity and aim yaw.
- Keyboard WASD → XZ; mouse → ground-plane aim + hold-to-fire.
- Gamepad: existing `readGamepadFrom` mapping; rumble unchanged.
- Press-once abilities (R/Q/E/F) unchanged.

### HUD

Keep **DOM/CSS HUD** over the WebGL canvas (health, wave, FAB abilities,
kill feed). Confetti/results stay DOM where they already are.

### What is removed from the play path

- 2D canvas world draw: `drawHuman` / `drawZombie` / `drawBuilding` bodies,
  ground PNG blit for the playfield, safe-area canvas vignette (replace with
  3D/post or screen overlay).
- `window.Models3D` billboard blit used by playfield characters.
- Dependency on Meshy `loader.js` for match rendering.
- Requirement that hero/weapon PNGs exist for in-match rendering (menu
  portraits may keep PNGs until a later menu pass).

## Data flow

```
input (touch/keys/pad)
  → updatePlayer / updateBot / updateZombie  (mutate x,z, aim yaw, hp)
  → fire / abilities / zone / horde
  → sync mesh.position / mesh.rotation from sim
  → renderer.render(scene, camera)
  → DOM HUD refresh
```

Audio (`sfx`, WebAudio) stays event-driven off combat hooks — no render coupling.

## Error handling

| Case | Behavior |
|---|---|
| WebGL unsupported / context lost permanently | Hard error screen; stop loop |
| Context lost temporarily | Attempt restore once; else hard error |
| Mesh factory throw | Log + skip that entity; do not crash match |
| Missing PNG / Meshy GLB | Irrelevant to playfield; ignore |

## Testing / verification

1. `node scripts/validate.mjs` — update gates if Meshy playfield requirement
   softens; keep version coherence (`GAME_VERSION` == CHANGELOG[0] == ROADMAP
   header).
2. Driver smoke: `node .claude/skills/run-brawl-arena/driver.mjs --play --shoot`
   with Chromium WebGL flags; screenshot high-angle view; zero page errors.
3. Manual / device: aim feel with mouse and touch; confirm gun tip aligns with
   aim; building cover still blocks; Horde to wave 5+ for dispose leaks
   (memory shouldn’t climb unboundedly).
4. Co-op (if pads available): midpoint camera + leash still sane under ortho.

## Migration plan (implementation order)

1. Scene bootstrap: WebGL canvas, ortho camera, lights, ground plane, hard
   error path.
2. Port arena + buildings to procedural meshes; strip 2D building draw.
3. Port humans + aim wrist; mouse/touch aim via ground raycast.
4. Port zombies + combat projectiles/VFX.
5. Zone, particles, floaters, kill-feed positioning.
6. Delete dead 2D playfield draw code and Meshy playfield wiring; bump version;
   update ROADMAP/memory; note Meshy moonshot as **cancelled (cost)**.

## Risks

| Risk | Mitigation |
|---|---|
| Aim feel regresses under ortho tilt | Tunable pitch/yaw; ground-plane raycast; playtest early |
| Mobile GPU cost | Low-poly caps; share materials; dispose aggressively; cap particles |
| Large blast radius in `src/game/**` | Long-lived feature branch; ship behind iterative driver screenshots |
| Co-op camera assumptions (`W×H` cull) | Keep ortho size fixed to stage; no variable zoom in v1 |
| iOS WKWebView WebGL quirks | Test native wrapper early; hard error better than broken 2D half-state |

## Open tunables (defaults)

| Const | Default | Suggested playtest range |
|---|---|---|
| `CAM_PITCH` | 60° | 55–65° |
| `CAM_YAW` | 15° | 0–25° |
| Ortho half-extent | match current visible world span | ±10% |
| Human proxy height | ~1.0–1.2 world units mapped to today’s footprint | silhouette check vs zombies |

## Success criteria

- Match plays entirely in WebGL with high-angle tactical view.
- No Meshy API or GLB required to boot or finish a Horde run.
- Twin-stick controls feel intact on phone + desktop.
- WebGL-less environments show a clear error, not a broken 2D fallback.
- Version bumped; ROADMAP marks 3D world as the active track and Meshy as cancelled.
