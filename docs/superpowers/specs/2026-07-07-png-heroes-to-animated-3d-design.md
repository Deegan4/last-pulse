# PNG Heroes → Walking, 360°-Aiming 3D Models

**Date:** 2026-07-07
**Repo:** Deegan4/last-pulse
**Goal:** Turn the 9 illustrated A-pose hero PNGs (`assets/img/hero-*.png`) into rigged 3D
characters that (a) **walk** as they move and (b) **rotate their arms in 360°** to point the
gun toward the aim direction — "full movement in game."

---

## Problem

The current Meshy 3D layer runs on a **stale manifest**: it references an old roster (`alex`,
`emily`, `griffin`, …) that no longer exists in the game. The game's real roster is the 9
heroes in `AVATARS` (index.html:700-708): **Blaze, Rose, Kenji, Marcus, Ghost, Dante, Nyx,
Kaito, Rex**, each shipping an illustrated A-pose PNG (`hero-<name>.png`). The 3D models the
game loads therefore don't match the art, and none of them aim their weapons.

We want each hero rebuilt **from its own PNG** so the 3D character resembles the illustration,
walks, and aims its gun in any direction.

## Constraints (ground truth)

- **`MESHY_API_KEY` is set.** No image-gen key (`OPENAI_API_KEY`, `REPLICATE_API_TOKEN`, etc.)
  is available — so AI-based arm-straightening / T-pose regeneration is **not** possible.
- Pillow 11.3 is installed; `sharp` is not.
- Single-file game: all game logic in `index.html`. No build step, no test suite.
- The 3D layer must stay **fail-safe**: any failure → the entity draws its 2D chibi.

## Decisions (locked with user)

| Decision | Choice |
|----------|--------|
| Pipeline depth | Full: **image-to-3D → rigging(+walk)** per hero |
| Movement required | **Both** — baked walk clip *and* 360° arm aiming |
| Walk source | Use the **rigging step's built-in walk** animation (no separate `/animation` task) |
| A-pose handling | **Pilot Blaze as-is first**; only Pillow-straighten if the rig fails |
| Rollout | **Pilot one hero (Blaze) end-to-end**, verify, then batch the other 8 |

---

## Architecture

Three independently-testable layers.

### Layer 1 — Asset pipeline (`scripts/gen-meshy.mjs`, extended)

Per hero, drive Meshy:

```
hero-<id>.png ──▶ POST /v1/image-to-3d    (image_url = base64 data URI of the PNG)
                       ↓ poll → preview GLB (input_task_id)
              ──▶ POST /v1/rigging          (input_task_id, height_meters:1.5)
                       ↓ poll → rigged GLB + built-in walk clip
              ──▶ download animated/walk GLB → assets/meshy/<id>-walk.glb
```
(Endpoint paths are relative to the script's `API` base const, which already includes the
`/openapi` prefix — matching the existing `/v2/text-to-3d` and `/v1/rigging` calls.)

- **Switch from text-to-3D to image-to-3D.** The current script (gen-meshy.mjs:144-145) posts
  `/v2/text-to-3d` with a prompt. New path posts `/v1/image-to-3d` with the hero PNG as a
  base64 data URI (or a served URL). Rigging stays `/v1/rigging` (already present at :159).
- **Rewrite `manifest.json` to the real roster.** Replace the alex/emily/griffin character rows
  with 9 rows keyed to the real hero ids (`blaze`…`rex`), each pointing at its `hero-<id>.png`
  source image and (once generated) its `<id>-walk.glb`. Weapon rows may stay as-is.
- **Regenerate `loader.js`** via `--emit-loader` so `MODELS[]` reflects the new roster. Each
  character row: `{ id, type:'character', table:'AVATARS', key:<index>, walk:'<id>-walk.glb',
  status:'generated' }`.
- **Idempotent:** rerunning only processes rows still `status:"queued"`. Credit-reconciliation
  and the existing `TEX_CAP`/shrink steps are preserved.
- **A-pose fallback (only if pilot rig fails):** a Pillow pre-step rotates each arm region
  downward before image-to-3D. Not built unless Blaze's rig actually fails — see Rollout.

### Layer 2 — Model discovery (existing — no code change)

The game's module script already builds the model map from `loader.js`
(index.html:3336-3343): for each `status:'generated'` character it maps
`avatar:<id> → assets/meshy/<walk||preview>`, loads the GLB, and if the GLB has animations,
plays `animations[0]` (index.html:3365). Because the new ids equal
`h.avatar.name.toLowerCase()` (the key used at :3401), every hero auto-wires with **zero game
changes here**. This is the payoff of matching ids to names.

### Layer 3 — Arm aim override (new — small change in the index.html 3D layer)

Walk animates legs + torso; we override the arms so they aim independently.

- **Bone discovery (once per loaded model):** after load, walk the skeleton and cache the
  left/right **upper-arm bones** by name-match (Meshy uses a standard humanoid skeleton;
  exact names confirmed empirically from the pilot GLB — likely `mixamorig`-style
  `*Arm`/`*Shoulder` or Meshy's own convention). Store `m.armBones = { L, R, restQuat }`.
- **Per-render aim:** in `renderTile(key, flip)` (index.html:3371), *after* `mixer.update(dt)`
  has posed the walk, rotate the upper-arm bones toward the entity's aim angle. The angle
  source is **`h.aim`** (radians, world space — set for player and bots alike; see
  index.html:1321,1651). Convert `h.aim` into a shoulder pitch/yaw relative to the model's
  facing and apply it to the cached arm bones' local rotation, then render.
- **Fail-safe:** if no arm bone is found, skip the override — the character still walks. If the
  whole 3D layer is absent, the 2D chibi draws (existing behavior). No new failure modes reach
  the game loop.
- **Plumb `h.aim` through:** `Models3D.drawHuman(ctx, h)` already receives `h`
  (index.html:3400) — pass `h.aim` into `blit`→`renderTile` so the override has the angle.

## Data flow

```
hero-blaze.png → [image-to-3d] → [rigging+walk] → blaze-walk.glb
                                                       │
                              loader.js: avatar:blaze ─┤
                                                       ▼
   game loads GLB → mixer plays walk → arm bones rotated toward h.aim → blit tile to 2D canvas
                                                       ▲
                              h.aim (per-frame aim angle) ┘
```

## Rollout — pilot first

1. **Blaze end-to-end:** `MESHY_API_KEY=… node scripts/gen-meshy.mjs --only blaze`
   (image-to-3d → rigging). Inspect: does `blaze-walk.glb` (a) resemble the PNG, (b) contain a
   walk clip, (c) expose nameable upper-arm bones?
2. **Branch on rig quality:**
   - Arms rig cleanly → proceed to batch.
   - Arms rig badly (fused/ambiguous) → build the Pillow arm-straighten pre-step, re-run Blaze,
     report before spending on the other 8.
3. **Wire Layer 3** against the pilot GLB's actual bone names; verify Blaze walks + aims
   headless.
4. **Batch the remaining 8:** `node scripts/gen-meshy.mjs` (idempotent; picks up queued rows).
5. **Bump `GAME_VERSION` + prepend `CHANGELOG`** (player-visible change → one-time "Game
   Updated!" popup). Add a `memory.md` bullet.

## Error handling

| Failure | Behavior |
|---------|----------|
| `MESHY_API_KEY` unset | pipeline no-ops (not the case here) |
| image-to-3D rejects the art | logged; that hero row stays `queued`; entity stays 2D |
| rigging fails on A-pose | logged; trigger Pillow pre-step for that hero, retry |
| arm bone not found | walk still plays; aim override skipped (fail-safe) |
| GLB fails to load in-game | entity draws 2D chibi (existing fallback) |
| no WebGL / no three.js | whole 3D layer absent; all-2D (existing) |

## Verification

- `node scripts/gen-meshy.mjs --only blaze` → `assets/meshy/blaze-walk.glb` exists; inspect
  bones (log skeleton names from a throwaway three.js load or `gltf-transform inspect`).
- `node scripts/validate.mjs` → both `<script>` blocks parse.
- `node .claude/skills/run-last-pulse/driver.mjs --play --mode br --shoot` → read `.shots/`
  PNGs: Blaze walks and his arm points toward the crosshair; no page errors.
- `grep -c "window.__" index.html` → 0 (no committed hooks).
- **On-device playtest (user):** does the arm aim read as natural while walking + firing in all
  directions? Any pop when aim crosses behind the character?

## Out of scope (YAGNI / fast-follow)

- Separate idle/run clips (walk-only for now; the rig's walk covers movement).
- Zombie model refresh (this task is heroes only).
- Weapon-model attachment to the hand bone (arms aim; the 2D gun/muzzle FX still drive combat).
- Retina `@2x` sprite variants.

## ROADMAP tie-in

Unblocks the "3D character layer matches the illustrated roster" milestone. Parked until this
lands: hand-bone weapon attachment, idle/run blend, zombie 3D refresh.
