# Meshy Generation Manifest — Brawl Arena

Tracks every Meshy task: which game-data row it maps to, the task_id (for re-roll/lineage),
settings, and credits. Keep this updated as the run proceeds.

**Account balance:** 1377 → 1362 (pilot, 3×5) → 1357 (rig Alex, 5)
**Model:** meshy-5 · **Topology:** quad · **Format:** glb · **Characters:** t-pose

### Credit reconciliation
| Batch | Tasks | Logged credits | Running balance |
|---|---|---|---|
| Pilot previews | 3 | 15 | 1362 |
| Rig Alex (incl. walk+run) | 1 | 5 | 1357 |
| **Total spent** | | **20** | |

> Validation: `meshy_check_balance` should read **1357**. If it doesn't, a task was double-charged or silently failed — investigate before the next batch.

### Rig validation ✅
`meshy_rig` on Alex (`019f1a91-c05f-76d2-81d4-e9be19527acf`) **SUCCEEDED** in 26s.
meshy-5 chibi topology auto-rigs cleanly → the full 14-character roster is safe to generate + rig.
Outputs on disk: `alex-rigged.glb` (skeleton) + `alex-walk.glb` (walk clip). Free running clip also available via the rig task.

## Pilot (3 models · 15 credits · SUCCEEDED)

| Asset | Type | Source row | task_id | File | Credits | Review |
|---|---|---|---|---|---|---|
| Alex | character | `AVATARS[0]` | `019f1a88-d554-7f9f-b8bd-40dd5359df6f` | `alex.glb` | 5 | ⏳ pending your eyeball |
| Normal zombie | zombie | `ZTYPES.normal` | `019f1a88-e219-78a7-9c06-b59a6f4f4637` | `zombie-normal.glb` | 5 | ⏳ pending |
| Pistol | weapon | `WEAPONS[0]` | `019f1a88-ee86-78a8-b3bf-5ec8b27bbf67` | `pistol.glb` | 5 | ⏳ pending |

## Remaining queue (25 models · ~125 credits · NOT yet generated)

Characters (14): Emily, Griffin, Eric, Jimmy, Astro, Saki, Kaito, Dennis, Luna, Rex, Bo, Pixel, Duke, Reina
Zombies (2): Runner, Brute
Weapons (9): Rifle, Shotgun, SMG, Magnum, Sniper, Crossbow, Flame, Minigun, Tommy

Prompts for all of the above are in [`PROMPTS.md`](PROMPTS.md). On go-ahead, generate with the
same settings (meshy-5, quad, glb, t-pose for characters).

## Driver: `scripts/gen-meshy.mjs`

One command generates everything still `status:"queued"` in `manifest.json`, polls, downloads,
auto-rigs characters, and writes results back (resumable — rerun picks up where it stopped).

```sh
node scripts/gen-meshy.mjs --dry-run              # plan + cost, no spend
MESHY_API_KEY=msy_… node scripts/gen-meshy.mjs    # full run (25 queued → ~195 cr)
MESHY_API_KEY=msy_… node scripts/gen-meshy.mjs --only rifle,smg   # subset
node scripts/gen-meshy.mjs --no-rig               # skip rigging
node scripts/gen-meshy.mjs --screenshot           # headless sprite PNGs (needs viewer server + playwright)
```

Built-in safeguards:
- **Face-gated rig** — reads the actual triangle count from the downloaded GLB; skips rig + warns if >300k (the `meshy_rig` hard limit) instead of failing mid-batch. (Pilot models are ~55k → safe.)
- **Credit reconciliation** — diffs `meshy_check_balance` before/after against summed task cost; **aborts** on mismatch so a silent double-charge can't compound across 25 models.
- **Resumable** — manifest is rewritten after every asset; a crash loses at most one in-flight model.

**Current queue:** 25 assets (14 char + 2 zombie + 9 weapon) · est. **195 credits** · balance 1357 (enough).

## Rubric scoring (fill in after review)

| Asset | Style | Color | Rig-ready | Silhouette | Cue | Total /10 | Verdict |
|---|---|---|---|---|---|---|---|
| Alex |  |  |  |  |  |  |  |
| Normal zombie |  |  |  |  |  |  |  |
| Pistol |  |  |  |  |  |  |  |

Pass = ≥8/10. <8 → note failure dimension, re-roll with ONE modifier changed.
