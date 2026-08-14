# Meshy Text-to-3D Prompt Pack — Brawl Arena

**Version:** v1.0
**Target:** Meshy 5 (text-to-3D)
**Pipeline goal:** True 3D pivot — riggable, game-ready models
**Style lock:** Cartoon chibi (big head, stubby limbs, flat saturated colors, bold clean silhouette)

Every character prompt is grounded in the live data tables in [`index.html`](../../index.html)
(`AVATARS` line 348, `WEAPONS` line 365, `ZTYPES` line 527). Hex colors from the `look`
descriptors are translated to named colors Meshy understands, and each avatar's `style` keyword
becomes one concrete visual cue.

## Prompt grammar (Meshy 5)

`Subject + 3–6 Modifiers (material / color / detail) + Style + Pose`

- **One object only** — no scenes, no props beyond what's worn/held.
- **T-Pose** on every humanoid → rig-ready output.
- Avoid micro-detail (individual hairs, fabric weave) — Meshy dilutes on >6 details.
- Style suffix is **identical across all assets** for a consistent set.

### Shared style suffix (append to every character)
```
chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### Shared style suffix (weapons)
```
stylized cartoon game prop, low-poly, clean topology, flat saturated colors,
bold chunky shapes, smooth matte surfaces, single object, white background
```

### Recommended generation settings
| Setting | Value | Why |
|---|---|---|
| Art style | **Cartoon** | Hard-matches the chibi look |
| Topology | **Quad** | Cleaner for rigging |
| Target polycount | **~10–15k** (chars), **~5k** (weapons) | Real-time budget |
| Symmetry | **On** (characters) / **Off** (weapons) | Humanoids are symmetric; guns aren't |
| With texture | **Yes** | PBR maps for the 3D pivot |

---

## CHARACTERS (15) — `AVATARS`

> Each is a chibi humanoid in T-pose. Skin/hair/outfit derived from the `look` hex; `style` → cue.

### 1. Alex  ·  `skin:#e8b48c hair:#241c16 outfit:#e6c84d style:curly`
```
A chibi human warrior with warm tan skin, dark brown curly hair, wearing a golden-yellow jumpsuit,
friendly rounded face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 2. Emily  ·  `skin:#f0c2a2 hair:#7a4a2a outfit:#e85d9a style:long`
```
A chibi human girl with light peach skin, long auburn-brown hair, wearing a hot-pink outfit,
cheerful face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 3. Griffin  ·  `skin:#d9a079 hair:#5a3a1a outfit:#c2622d style:beard`
```
A chibi human man with tan skin, a short brown beard, wearing a burnt-orange jacket,
rugged friendly face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 4. Eric  ·  `skin:#7a5236 hair:#171717 outfit:#5a86c2 style:dreads`
```
A chibi human man with deep brown skin, short black dreadlocks, wearing a steel-blue hoodie,
calm confident face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 5. Jimmy  ·  `skin:#e8b48c hair:#d4dcc8 outfit:#bfe0c0 style:mask`
```
A chibi human survivor with tan skin, pale grey hair, wearing a mint-green outfit and a simple white face mask,
chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 6. Astro  ·  `skin:#6b4630 hair:#121212 outfit:#eef0f2 style:beard`
```
A chibi human astronaut with dark brown skin, black beard, wearing a clean white spacesuit,
heroic friendly face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 7. Saki  ·  `skin:#f0c8b0 hair:#9a5acb outfit:#3a3f4a style:glasses`
```
A chibi human girl with fair skin, purple bob hair, round glasses, wearing a dark slate-grey jacket,
smart cute face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 8. Kaito  ·  `skin:#e8b48c hair:#141414 outfit:#2a2f3a style:ninja`
```
A chibi ninja with tan skin, black hair, wearing a dark charcoal ninja outfit with a face wrap,
stealthy stance, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 9. Dennis  ·  `skin:#7bbf5a hair:#5a8a3a outfit:#3a3f4a style:frog`
```
A chibi frog-man character with bright green skin, darker green head, wearing a slate-grey outfit,
big round eyes, friendly amphibian face, chibi cartoon style, big head small body, low-poly game asset,
clean topology, flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 10. Luna  ·  `skin:#f0c8b0 hair:#cfd0e8 outfit:#7a4ab0 style:long`
```
A chibi human girl with fair skin, long silver-lavender hair, wearing a purple outfit,
dreamy calm face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 11. Rex  ·  `skin:#caa07a hair:#b0413a outfit:#3a5a3a style:cap`
```
A chibi human man with tan skin, red-brown hair, wearing a forest-green vest and a backwards baseball cap,
tough friendly face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 12. Bo  ·  `skin:#e8b48c hair:#e0a030 outfit:#d23030 style:mohawk`
```
A chibi human punk with tan skin, a tall yellow-blonde mohawk, wearing a bright red jacket,
energetic grin, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 13. Pixel  ·  `skin:#e8b48c hair:#2a2f3a outfit:#2bd6c0 style:visor`
```
A chibi cyber character with tan skin, dark hair, wearing a glowing teal visor and a teal techwear suit,
futuristic look, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 14. Duke  ·  `skin:#d9a079 hair:#1c1c1c outfit:#34303a style:tophat`
```
A chibi gentleman with tan skin, black hair, wearing a dark purple-grey suit and a black top hat,
classy confident face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### 15. Reina  ·  `skin:#f0c8b0 hair:#3a2a4a outfit:#b03a6a style:crown`
```
A chibi queen with fair skin, dark plum hair, wearing a magenta-rose royal gown and a small gold crown,
regal graceful face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

---

## ZOMBIES (3) — `ZTYPES`

> Same chibi proportions, but undead. Sizes mirror the in-game `size` field.

### Z1. Normal  ·  `skin:#7bbf5a torso:#566b3a size:1.0`
```
A chibi cartoon zombie with sickly green skin, olive-green tattered shirt, slouched posture,
empty white eyes, simple stitches, chibi cartoon style, big head small body, low-poly game asset,
clean topology, flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### Z2. Runner  ·  `skin:#9ed86a torso:#5e7a36 size:0.82`  (small & lean)
```
A small lean chibi cartoon zombie with bright lime-green skin, ragged green shirt, skinny limbs,
hungry snarl, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

### Z3. Brute  ·  `skin:#4f8a3a torso:#3c5226 size:1.35`  (huge & bulky)
```
A huge bulky chibi cartoon zombie brute with dark green skin, massive shoulders, torn dark-green shirt,
heavy fists, menacing face, chibi cartoon style, big head small body, low-poly game asset, clean topology,
flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background
```

---

## WEAPONS (10) — `WEAPONS`

> Standalone props, no character. Slightly exaggerated chunky cartoon proportions to read at small scale.

### W1. Pistol  ·  `dmg:30 mode:semi`
```
A stylized cartoon semi-automatic pistol, compact handgun, dark gunmetal body, brown grip,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W2. Rifle  ·  `dmg:10 mode:auto`
```
A stylized cartoon assault rifle, long barrel, banana magazine, matte black and olive body,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W3. Shotgun  ·  `mode:shotgun`
```
A stylized cartoon pump-action shotgun, wide double barrel, wood stock, dark steel body,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W4. SMG  ·  `mode:auto, blazing fire rate`
```
A stylized cartoon compact submachine gun, short barrel, boxy black body, vented handguard,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W5. Magnum  ·  `dmg:55, heavy revolver`
```
A stylized cartoon heavy revolver, long barrel, big cylinder, chrome metal with brown grip,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W6. Sniper  ·  `dmg:250, pierces, huge range`
```
A stylized cartoon bolt-action sniper rifle, very long barrel, large scope, bipod, dark green body,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W7. Crossbow  ·  `dmg:90, silent piercing bolt`
```
A stylized cartoon crossbow, taut string, loaded bolt, wood and dark metal frame,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W8. Flame  ·  `mode:flame, sets enemies on fire`
```
A stylized cartoon flamethrower, fuel tank, wide nozzle, red and steel body, small pilot flame,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W9. Minigun  ·  `mode:auto, huge mag`
```
A stylized cartoon six-barrel minigun, rotating barrels, ammo box, bulky dark metal body,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

### W10. Tommy  ·  `mode:auto, drum-mag`
```
A stylized cartoon Tommy gun, round drum magazine, wood foregrip and stock, dark metal body,
stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes,
smooth matte surfaces, single object, white background
```

---

## Evaluation rubric (run after each batch)

Score each generated model 0–2 on:

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| **Style match** | photorealistic / wrong genre | partly chibi | clean chibi, matches set |
| **Color fidelity** | wrong palette | close | matches the `look` hex intent |
| **Rig-readiness** | fused/melted limbs | minor cleanup | clean T-pose, separable limbs |
| **Silhouette** | mushy | ok | reads instantly at thumbnail size |
| **Identity cue** | generic | hinted | the `style` keyword is clearly present |

**Pass = ≥8/10.** Anything <8 → note the failure dimension and re-roll (Meshy 5 varies a lot
on small prompt changes — change ONE modifier at a time).

## Known limitations
- Meshy may ignore very small accessories (glasses, crown, visor) at low polycount — bump
  polycount or call the accessory out as the **first** modifier if it keeps dropping.
- "T-pose" sometimes yields an A-pose; both rig fine. Reject only fused limbs.
- The frog-man (Dennis) and the mask/visor characters are the highest-variance prompts — expect
  2–3 re-rolls each.

## Sources
- [Best Practices for Creating a Text Prompt — Meshy](https://help.meshy.ai/en/articles/11972484-best-practices-for-creating-a-text-prompt)
- [How to Write Perfect Text Prompts for Meshy 5 — Meshy Blog](https://www.meshy.ai/blog/meshy-5-text-to-3d)
