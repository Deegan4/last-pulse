# memory.md — project handoff & running notes

_Last updated: 2026-07-03. Working memory for **Last Pulse** (repo `Deegan4/last-pulse`,
v1.8.0). For architecture details see [CLAUDE.md](CLAUDE.md); this file is the "where we are /
what's next" snapshot — **add a bullet under "Current state" for every shipped change**._

## What this is
A single-file HTML5 canvas game — portrait, mobile-first, cartoon **twin-stick survival
royale** — a from-scratch remake inspired by the StickyGames title _Don't Die_ (all art is
canvas-drawn; no original sprites). Everything lives in [`index.html`](index.html): the game
IIFE + a fail-safe 3D model layer (`assets/meshy/`). No build step, no deps.

## Current state (done)
- **v2.9.0 arms** — the 9 new heroes are flagged `armless:true`; `drawHeroSprite` now mounts a live
  **gun-arm** on them via `drawHeroArm(h,bob)` — a sleeve-coloured (`look.outfit`) arm pinned at the
  chest that rotates to `h.aim` a full **360°** with `drawGun` in-hand (skin knuckle at the grip,
  support hand on the foregrip for two-handed guns, muzzle flash at the barrel tip). Mirrors the 2D
  chibi's arm rig; the old baked-in-gun heroes are untouched (no `armless` flag → old muzzle-flash
  path). Verified headless via a throwaway `window.__hook` (drives `aimVec`): Cypher+Rifle and
  Lila+Pistol both aim right/up/left/down/diagonal correctly, gun stays upright when aiming left.
- **v2.9.0** — **9 new sprite heroes** (roster now **18**), from the nine "armless" (arms-at-sides)
  PNG portraits: **Kai** (Lv30, 5.6/104, blue-hair shades, `style:'glasses'`), **Milo** (Lv33,
  5.5/110, orange hoodie, `curly`), **Chip** (Lv36, 6.0/88, green backwards-cap kid, `cap`),
  **Lila** (Lv40, 6.3/80 — new fastest, pink tracksuit, `long`), **Yuki** (Lv44, 6.0/90, purple-hair
  ninja girl, `long`), **Vex** (Lv48, 6.1/86, red-bandana hood, `ninja`), **Sarge** (Lv52, 4.6/140 —
  new tankiest, bald soldier, `beard`), **Finn** (Lv57, 5.3/118, blonde leather adventurer, `mohawk`),
  **Cypher** (Lv62, 5.9/96, silver-hair cyber visor, `visor`). Same drop-in pattern: `git mv` each
  UUID PNG → `assets/img/hero-<name>.png`, a `loadImg()`, an `AVATARS` row (guns bake into the sprite
  via `drawHeroSprite`; `look` reuses existing `drawHair` styles so the 2D fallback needs no new
  cases). Verified headless over http: avatar grid renders all 18 with correct stat bars, auto role
  badges, and unlock gates.
- **v2.8.0** — 2 more sprite heroes (roster now **9**): **Onyx** (Lv22, Swift 5.8/100, black hooded
  assassin, `style:'ninja'` fallback) + **Hopper** (Lv26, Swift 6.2/84, suited frog, `style:'frog'`
  fallback). Same drop-in pattern (PNG + `loadImg` + `AVATARS` row); guns baked in → `drawHeroSprite`
  L/R path. Verified: avatar grid renders all 9 with correct gates.
- **v2.7.0** — **5 new sprite heroes** (roster now 7): **Bjorn** (Lv3, Tank 4.8/135, red/beard),
  **Zane** (Lv6, All-round 5.4/108, blue/dreads), **Wraith** (Lv10, Swift 6.1/82, white hood),
  **Ace** (Lv14, Swift 5.7/100, white/cornrows), **Nova** (Lv18, Swift 5.9/92, purple ninja).
  Each is one PNG cutout in `assets/img/hero-*.png` + a `loadImg()` + an `AVATARS` row
  (name/speed/health/unlock/img + `look` fallback). All have guns baked in → they use the existing
  `drawHeroSprite` L/R-flip path (the gunless-art + rotating-gun plan is separate, still pending
  gunless PNGs). Unlock levels gate them behind leveling. Verified: avatar grid renders all 7
  (locked cards dimmed w/ level gates), live BR match clean. Note: headless driver now reports a
  CORS "FAIL" for the 3D layer's locally-vendored `three.module.js` over file:// — pre-existing
  (added by the 3D-preview work on main), benign (falls back to 2D), works over https.
- **v2.6.1** — hero sprites now **turn to face the aim**, not the movement direction. Root cause:
  `integrate()` overwrites `h.faceX` from movement velocity (line ~1750) AFTER `updatePlayer`
  sets it from aim, so a static sprite shot backwards while running (the drawn chibi hid this — its
  gun arm rotated freely). `drawHeroSprite` now derives `flip` from `Math.cos(h.aim)` with a ±0.06
  deadzone + a sticky `h.spriteFlip` so it doesn't jitter aiming near-vertical. Muzzle flash already
  used true aim, so it stays consistent. Verified headless: aim-left→faces left / aim-right→faces
  right while running right.
- **v2.6.0 "Illustrated World"** — first raster-sprite art layer (a deliberate, user-supplied
  break from the "all art drawn with canvas shapes" pillar; degrades safely to the drawn art).
  New `assets/img/` holds 5 PNG cutouts (grass, tree, bush, 2 heroes). An `IMG` cache +
  `loadImg`/`imgOk(key)` load them lazily; every draw path does `const im=imgOk(...)` and falls
  back to canvas shapes if the image never decodes. `AVATARS` **shrank to 2** image heroes —
  **Blaze** (yellow jacket, `img:'hero-blaze'`) + **Rose** (pink, `img:'hero-rose'`), both
  `unlock:1`; each keeps a `look` for the drawn fallback. `meta.avatar` is clamped to the new
  table length right after the `meta` object (stale saved index would otherwise index past it).
  `drawHuman` early-returns to new `drawHeroSprite(h,img)` (billboard: shadow + player ring +
  walk-bob/run-lean + `filter:brightness` hit-flash + muzzle flash along aim + reload ring);
  `portraitChibi` and the menu `renderMenu` fighter portrait draw the PNG bottom-aligned.
  `groundPattern()` builds a 512 tile from the seamless grass PNG with a `GROUND_TINT` dusk/night
  overlay; `drawDecor` tree/bush branches billboard their PNGs (aspect-preserved, feet at anchor).
  Loader `onload` resets `groundKey` + re-renders menu/grid so a late decode still shows. Verified
  headless: live BR match (Blaze player + illustrated grass/tree/bush, no boxes/errors) + avatar
  grid (both hero portraits, correct class chips/stats). More heroes = drop a PNG + a row.
- **v2.5.0 "Arsenal & Fighters"** (2 weapons + 2 avatars → 12 weapons, 17 avatars): **Launcher**
  (Lv12, `mode:'launcher'`) fires a single slow rocket bullet flagged `boom:true`/`rocket:true`;
  `updateBullets` explodes it via the existing `explode()` on any impact / at max range (not
  off-map), splash 90/scaled — self-damage possible like the bomb. **Vipers** (Lv15, `twin:true`)
  fires 2 side-by-side bullets (`shots=w.twin?2`, ±0.02 spread + perpendicular muzzle offset).
  New `drawGun` flags: `tube` (launcher barrel + flared mouth + red stripe) and `twin` (lower
  barrel). Rocket has its own in-flight sprite (warhead+fins+exhaust) in the bullet draw loop;
  `sfx('shoot','launcher')` + WMODE `launcher:'BOOM'` + `.wmode.launcher` CSS; `wstats` shows the
  launcher's 90 splash as its perShot. **Avatars** Seraph (`halo` style — gold ring) + Diablo
  (`horns` style — bone horns), both added to `drawHair` (in-game) AND `portraitChibi` (menu).
  GAME_VERSION 2.5.0.
- **v2.4.0 weapon-select UI revamp**: **weapon art upgraded** — `weaponIcon(w)` now renders on a
  hi-res DPR-scaled canvas (124×58 CSS ×3), ~2× bigger gun (scale cap 1.8→3.6), with a contact
  shadow + drop shadow ("product shot"); the in-game `drawGun` is untouched (perf). Cards also gained
  **rarity tiers** (`weaponTier(w)`
  by unlock level: Common/Rare/Epic/Legendary → `#a7b39a/#5aa8ff/#c08bff/#ffcf3a`) driving a
  `--tier` CSS var used for a colored top-border, icon-plate ring, and a `.wtier` chip; and a
  **DPS-vs-equipped delta** (`dpsDelta`, green ▲ / red ▼ / "EQUIPPED") computed against
  `wstats(WEAPONS[meta.weapon]).dps`. Selecting now rebuilds the grid so all deltas re-baseline to
  the new pick. Locked cards read "🔒 Unlocks at Lv N". GAME_VERSION 2.4.0.
- **v2.3.0 rank ladder + level rewards** (user: "need more levels" — progression flattened after
  the level-25 avatar-unlock ceiling): added a `RANKS` table (Rookie→Fighter→Veteran→Elite→Master→
  Champion→Legend→Mythic→Immortal, thresholds 1/5/10/16/22/30/40/55/75) with `rankFor(lv)` /
  `nextRank(lv)`. `grantXp` now pays coins on every level-up (`levelReward(lv)=20+lv*4`, 24→380🪙)
  and sets `lastLevelCoins`/`lastRankUp`; `levelToast` shows the coin payout + a staggered
  "NEW RANK" toast on promotion. Fighter card shows a gold rank chip (`#menuRank`) + next-rank hint
  (`#menuRankNext`) via renderMenu. Results "one-more-run" teaser (`#rNext`) falls back to the next
  rank once all avatars/weapons are unlocked, so there's always a goal. GAME_VERSION 2.3.0.
- **v2.2.0 "Alive World"**: 🏕 **campfire heal aura** — `campfireHeal(h,dt)` (called from
  updatePlayer) regens `CAMPFIRE.heal` (6) hp/s within `CAMPFIRE.r` (72px) of any cached
  `campfires` (filtered from decor in buildDecor), green heal sparks; grace/full-hp guarded.
  🧟 **indoor-aware zombies** — `updateZombie` now routes to a building's door when the prey is
  inside (`insideBuilding(x,y)` helper): aims at prey for visuals, moves toward the door gap,
  and **skirts the nearer corner** when on the wrong side (verified 247→20px path-in). 🚪
  **second door on big houses** — `wallRects` adds a top-wall door gap for `o.w>BIG_HOUSE` (170);
  the facade-fade `nearDoor` check recognizes both bottom + top doors. 🎯 **BR aim easing** — bots
  also shoot wider during the early warmup: `fire()` uses `botAcc = h.acc*(1+1.6*(1-warm))`,
  `warm=clamp(elapsed/18,0,1)` (complements v2.1.2's sight/reaction easing). Deferred (need splat
  refactor, low value): wall blood streaks + dried-blood aging (see ROADMAP). GAME_VERSION 2.2.0.
- **v2.1.2 menu top-space + BR difficulty** (user-reported): (1) `#startScreen.menu` used
  `padding-top:6vh` which stacked on top of the notch, leaving a big empty band under the Dynamic
  Island. Fixed with `padding-top:calc(env(safe-area-inset-top,0px)+10px)` and made `.screen`
  base padding notch/home-bar-aware too (logo top 51px→9px no-notch; just below notch on device).
  (2) BR was brutal at drop-in (14 armed bots detect at 440–560px, fire in 0.3–0.7s). Added an
  **early-match warmup** in `updateBot`: `warm=clamp(elapsed/18,0,1)`; effective detection range
  `aggro*(0.45+0.55*warm)` and fire-reaction delay scaled up early (extra vs the player:
  `reaction*(2.4-1.4*warm)`). Also BR initial zombies 10→6, and `newBot` now rerolls its spawn if
  within 560px of the player (BR + Squads). GAME_VERSION 2.1.2.
- **v2.1.1 fighter visibility fix** (user-reported: characters looked faded/see-through): `drawDayNight()`
  (the dusk/night screen-space tint) was called AFTER the whole world render, so it dimmed +
  desaturated characters/decor along with the ground → low-contrast, washed-out fighters. Fix:
  moved `drawDayNight()` to run right after the field + ground-decor pass and BEFORE the y-sorted
  entity pass (split the camera-transform into two save/translate blocks), so the tint colors only
  the ground and characters draw at full brightness on top. Also softened night from
  `rgba(18,28,74,.36)`→`.30`. Day is a no-op (unchanged). Verified night + dusk headless — fighters
  now crisp/opaque. **Gotcha: full-screen canvas overlays (tints/vignettes) drawn after entities
  wash them out; tint the ground layer, not the entities.** GAME_VERSION 2.1.1.
- **v2.1.0 main-menu split**: the old `#startScreen` combined the landing page + mode picker.
  Now `#startScreen` is a pure **home screen** (logo, fighter card, ▶ PLAY, daily, stats,
  achievements/shop) and the mode cards moved to a new `#modeScreen` (`.top` back arrow
  `#modeBack`, heading, three `.modecard`s, a mode-aware Continue button `#toAvatarBtn` whose
  `#modeLabel` reads "CONTINUE · <MODE>"). Flow: home → `#toModeBtn` → mode → `#toAvatarBtn`
  (goAvatar) → avatar → weapon → drop in. `show()` toggles `modeScreen` too and calls
  `renderModeSel()` on it. Portrait-tap/`changeAvatar` still jump straight to avatar (change-fighter
  shortcut). **Driver + SKILL.md updated**: the menu flow now needs a `#toModeBtn` click before
  the `[data-mode]` card (cards live on the mode screen now). GAME_VERSION 2.1.0.
- **v2.0.1 layout fixes** (user-reported via screenshots): (1) the v2.0.0 safe-area rule
  `#powers{bottom:calc(210px+env())}` came LATER in the sheet than the `@media(max-height:560px)`
  landscape block and — since media queries add no specificity — clobbered `bottom:12px`, so in
  landscape the power buttons snapped back to the portrait mid-screen spot and floated over the
  player. Fix: re-assert the landscape bottom-centre row in a media block at the very END of the
  stylesheet (last-in-source wins). Gotcha: **any `#foo` rule after a `@media` `#foo` rule wins
  regardless of the media query** — keep responsive overrides last. (2) On iOS the menu flex
  column compressed (default `flex-shrink:1`) so PLAY overlapped the Daily Challenge card, worsened
  by the PLAY glow bleeding down. Fix: `#startScreen.menu > *{flex-shrink:0}` (column scrolls
  instead of overlapping) + tamed the play glow + explicit 14px margins. GAME_VERSION 2.0.1.
- **v2.0.0 "Interface Overhaul"**: a **UI v2 override layer** appended at the END of the
  `<style>` block (tune tokens there, not per-rule) — deep "midnight forest" gradients on
  `.screen`, frosted glass (`backdrop-filter:blur` + gradient-over-glass backgrounds) on cards /
  fighter / mode cards / stat tiles / HUD panels / modals, entrance motion (`scrIn` on
  `.screen:not(.hidden)`, `mdIn` slide-up on `.modal:not(.hidden)`), gradient-text logo
  (`background-clip:text` + drop-shadow glow; `.logo small` resets fill), hero-button `sheen`
  sweep (`.btn.play::after` only — deliberately not all buttons), springier `.btn` press curve,
  and notch **safe-areas** (`env(safe-area-inset-*)` on `#gearHud/#xpwrap/#mmwrap/#powers`).
  Selectors untouched → zero JS changes. Verified every screen headless (start/avatar/weapon/
  settings/HUD/results), no page errors; backdrop-filter renders in headless Chromium.
  ⚠ Multi-layer `background: <gradient> padding-box, <color>` — the color must be the LAST layer.
  GAME_VERSION 2.0.0. (User asked about "other languages" — declined: browser ships HTML/CSS/JS;
  a build step would break the single-file pillar without improving the UI.)
- **v1.10.0 "Growing World"**: the map scales with `meta.level` in `buildDecor` — buildings
  `9+floor(lvl/4)` (cap 16, each still hiding interior loot), ponds `7+floor(lvl/8)` (cap 10),
  trees/bushes/grass/flowers/rocks/dirt get an `xtra=min(lvl,20)` density bonus. **Level-milestone
  landmarks** (new decor types, y-sorted via `TALL_DECOR` map): `campfire` (Lv3 — stone ring,
  crossed logs, flickering flame, warm glow at night), `fence` (Lv6 — post-and-rail runs,
  horizontal/vertical), `well` (Lv10 — stone rim, water hole, posts + gable roof, rope+bucket),
  `statue` (Lv15 — weathered stone hero on a pedestal w/ cracks + moss). All placed via
  `decorSpot` (avoid buildings/ponds), decorative only (no collision). Verified scaling
  lvl 1/5/10/20/30 → buildings 9/10/11/14/16, landmarks appear on schedule; per-landmark
  screenshots. Also 🩸 **blood splatter**: hits spray directionally along the shot path (count
  scales w/ dmg) + close mist + ground splatter decal on 12+ dmg (cap 220 live); deaths add a
  directional gout + satellite pools. **All blood is red** (user call — dropped the green
  zombie-goo convention). GAME_VERSION 1.10.0.
- **v1.9.0 "Open Doors"**: 🚪 **enterable buildings** — buildings are hollow: `wallRects(o)` returns
  4 wall rects with a bottom-centre door gap (`WALL_T=9`, `DOOR_HALF=21` → 42px gap: humans r15 fit,
  brutes r20 barely). `resolveObstacles`/`bulletInObstacle` collide per-wall via `pushOutRect`, so
  entities walk in through the door and bullets pass doorways but not walls. Rendering splits into
  two y-sorted layers: `drawBuildingBase` (shadow + wood floor/rug/crate/table + wall frame,
  sorted at the building's TOP edge so entities inside draw on top) and `drawBuilding` facade
  (sorted at bottom edge, `d.fade` → 0.15 when the player is inside or at the door, lerped;
  computed in the base pass). Interior **loot**: `spawnMatch` drops one `makePickup` inside every
  building (pickup y-sorts under the facade → hidden until entered). Functional tests: walk in
  through door / blocked by top wall / blocked by side wall — all pixel-exact. 🔫 **weapon detail
  pass** (`drawGun` + GUNK flags): trigger guards (`guard`), pistol slide serrations (`serr`),
  wood-grain waves (`wood`), handguard vents (`vents`), muzzle-brake slots (`brake`), muzzle cap
  rings (`muzzle`), magnum nickel top + gold trigger/band (`nickel`), hazard stripes on the flame
  tank (`hazard`), minigun rotary barrel cluster (`cluster`) — cards upgrade automatically via
  `weaponIcon`. GAME_VERSION 1.9.0.
- **v1.8.0 "Juice & Hooks"**: ⚡ **kill combos** — kills inside a 3s window chain (`combo`/`comboT`,
  `COMBO_WIN`), XP multiplied up to 3× (`1+(combo-1)*0.25`), gold "COMBO xN" floaters + rising
  `sfx('combo',n)`, an on-screen combo meter w/ draining chain bar (drawn after the streak callout),
  and **hitstop** — `hitstop` timer set on player kills scales gameplay `dt` ×0.15 for a slow-mo
  beat (escalates with combo, cap 0.12s; decremented by wall dt in `loop`). `matchStat.bestCombo`
  feeds 2 new achievements (`combo4` Chain Reaction, `combo6` Kill Frenzy → 16 total). **Zombie
  animation pass** (`drawZombie`): drunken lurch lean (vx tilt + never-settling sway via per-zombie
  `seed`), clawing out-of-phase arms w/ stubby fingers, head loll, **attack lunge** (`z.lunge` set
  on hit in `updateZombie`, snap-toward + swell + open jaw w/ teeth), **glowing eyes at night**
  (`timeOfDay!=='day'`), runner scrabble-dirt + brute stomp-clods, and a green death-pop ring in
  `die()`. **Results hooks**: `nextUnlock()` teaser (`#rNext`, "🔓 X unlocks at Lv N — M XP to go")
  + "🔥 SO CLOSE!"/"😤 Almost had it!" flavor on places 2/3.
- **Core loop**: avatar select (15 chars, level-gated unlocks), weapon select, grass-field
  arena, shrinking "safe area", 15-player field of bot humans + roaming zombies (normal/
  runner/brute), XP/level, results screen. Twin-stick touch + WASD/mouse + gamepad.
- **Weapons (10)**: Pistol, Rifle, Shotgun, SMG, Magnum, Sniper, Crossbow, Flamethrower
  (burn DoT), Minigun, Tommy. Ammo + auto-reload, pistol crit, sniper/crossbow pierce.
- **Pickups & supply drops**: health, medkit, armor (blue shield), ammo, weapon swaps;
  parachuting supply crates with a strong weapon + armor.
- **Juice**: hit/kill markers, kill-streak callouts, blood + ground splats, damage-direction
  indicator, per-weapon SFX, optional music, **#1 VICTORY** confetti screen, power-ups
  (lightning chain, bomb AoE).
- **Progression & stats**: career stats (wins / matches / kills / K-D / best placement / streak)
  on a start-screen card + a results career line; **weapons are level-gated** (unlock by level
  like avatars; `weaponUnlocked`).
- **Art pass**: dark-outlined cartoon characters & zombies with shading, real faces, and
  per-weapon gun shapes (`GUNK`/`drawGun`); matching upgraded avatar portraits.
- **Modes & map**: Battle Royale / Endless Horde / Squads; 3000² map with buildings (cover +
  bullet-blocking), water ponds, day/dusk/night.
- **Game feel 2**: aim reticle, reload ring, low-ammo flash, **spectate-after-death** (watch a
  survivor, "Results ▸" button), gamepad support, SFX-volume + aim-sensitivity sliders.
- **Content**: 15 avatars, 10 weapons. New looks need a `style` case in BOTH `drawHair`
  (in-game) and `portraitChibi` (grid); `visor`/`tophat`/`crown` added (Pixel/Duke/Reina,
  unlock 20/22/25). `visor` suppresses the default face (like `frog`). New weapon **Tommy**
  (auto, drum mag, unlock 8) — `GUNK.Tommy` has a `drum` flag drawn in `drawGun`.
- **Fire feel**: muzzle flash at the gun tip, gun recoil kick, ejected brass shell casings,
  glowing piercing tracers; new hairstyles (mohawk on Bo, cap on Rex).
- **Visual pass**: edge vignette (offscreen-blitted), smooth camera follow, richer ground
  (flowers/rocks/dirt paths, round + pine trees, swaying grass), pulsing pickup glow. Perf:
  ground decor draws in a flat pass (no per-frame y-sort), grass batched to one stroke.
- **Decor placement cleanup**: new `decorSpot(m)` helper retries `blockedSpawn` so trees / bushes /
  rocks no longer spawn on buildings or in ponds (grass/flowers left as-is — tiny ground decor).
  Verified 0/22200 blocked placements over 300 worlds.
- **Buildings-in-ponds fix**: `buildDecor` placed buildings checking only other buildings + map
  centre, never water — so houses could spawn on top of ponds. Added a pond-AABB rejection
  (`wd.s+30` × `wd.s*0.64+30`) to the building placement loop. Verified 0 overlaps across 400
  regenerated worlds (3600 buildings), building count unaffected. (Reported via landscape screenshot.)
- **Landscape HUD fix**: the bottom-anchored vertical `#powers` stack (`bottom:210px`, tuned for
  tall portrait) rode up into the top-right minimap on short/landscape viewports. Added
  `@media (max-height:560px)` → powers become a compact **bottom-centre row**, minimap scales to
  .82, xp pill narrows. Portrait unaffected. (Reported via a real landscape phone screenshot.)
- **In-game HUD upgrade**: XP row is now a flex pill — a green `#lvlText` LV badge + a glossy
  `#xpbar` (`::after` top-sheen). Minimap sits in a translucent framed `#mmwrap` panel with
  icon-led stat rows (`.srow`/`.si`: 👥 players / 💀 kills / ⏱ safe / 📶 fps, safe value yellow).
  Power buttons get a `.ready` glow when off cooldown (toggled in `refreshHud`) and desktop-only
  keybind hints (`.power .key` Q/E/F, hidden via `body.touch` — set from `isTouch`).
- **Results & settings UI upgrade**: results screen (`showResults`) rebuilt as a match-summary
  card — 4 stat tiles in a 2×2 grid (Kills / Place(or Wave) / Survived / XP), an animated XP-gain
  bar with LEVEL-UP text, a bordered career panel, and a pulsing gold glow on `.placard.win`
  (`winGlow`). Settings options got icons (`.oic`) + left-aligned layout; the music toggle uses a
  `#sMusicTxt` span so setting its text doesn't wipe the icon.
- **Avatar-select UI upgrade** (matches the weapon cards): `buildAvatarGrid` adds a class chip
  (`avClass`: Tank hp≥130 / Swift spd≥5.6 / All-round) next to the name, color-coded Speed (cyan
  `.bar.spd`) / Health (green `.bar.hp`) bars via the shared `statBar`, and a SELECTED ribbon that
  follows the click. Reuses `.wtop`/`.nm2`/`.equip` from the weapon cards.
- **Weapon-select UI upgrade**: `buildWeaponGrid` cards now show a color-coded **fire-mode chip**
  (SEMI/AUTO/SHOT/SNIPE/FLAME), a big gold **DPS headline** (`wstats(w)`: perShot×mag / (mag·fireCd
  + reload), pellets folded in for shotgun/flame), **color-coded stat bars** (dmg red / fire yellow
  / mag green / range blue via `statBar` + `.bar.<cls>` CSS), and an **EQUIPPED ribbon** on the
  selected card (moved on click). Fire-rate row shows rounded RPM.
- **Buildings & water pass**: `drawBuilding` — shingled roof (clipped courses) + ridge highlight +
  chimney, wall top-light/right-shade/trim, paneled door, and **windows that glow warm at
  dusk/night** (`lit=timeOfDay!=='day'`; blue glass + glint by day). `drawDecor` water gains
  seeded lily pads + a pink lily + moon-tint glint at night.
- **Environment/item art pass**: `drawDecor` trees now cartoon-outlined (unified INK blob behind
  the canopy) with layered green shading + shaded trunk (round + pine); bushes outlined with
  berries + highlight; rocks get a dark facet + brighter light facet; grass gets light tips;
  flowers outlined. `drawDrop` supply crate rebuilt as a wooden loot crate (planks, metal corner
  brackets, red band + gold ★). `drawPickup` gains a clipped top-gloss / bottom-shade bevel.
- **3D model wiring (Meshy)**: the in-game 3D layer (2nd `<script type=module>`) now builds its
  model map from the auto-generated `assets/meshy/loader.js` (`MODELS`, `status:"generated"` only)
  instead of a hardcoded 2-entry map — so every model produced by `scripts/gen-meshy.mjs`
  auto-wires on next load (keys = lowercased avatar name / zombie kind; characters prefer `walk`).
  Falls back to the Alex+normal-zombie pilots if `loader.js` can't import. Also fixed the avatar-
  screen hero preview (was `renderTile('avatar:0')`, a key that never existed → now first loaded
  character). ⚠ Only 3 pilots generated so far; the other 25 need a `MESHY_API_KEY` /authorized
  Meshy MCP to generate (`node scripts/gen-meshy.mjs`). CDN (unpkg three.js) is blocked in the
  sandbox, so the 3D path can't be verified headless — confirm in a real browser over http(s).
- **Main menu upgrade**: `#startScreen` redesigned — pulsing "LAST PULSE" logo + red heartbeat
  backdrop (`.menuGlow`, CSS `menuPulse`/`beat`), drifting spores, a **fighter card** (live
  `portraitChibi` of `meta.avatar` + inline editable name + LV badge + XP bar, tap portrait →
  avatar select via `goAvatar`), **mode cards** with icon/title/description (`.modecard`, replaces
  `.modebtn`), and a hero Play button showing the selected mode (`renderMenu` sets `#playLabel`).
  ⚠ `.screen` relies on `position:absolute; inset:0` for full height — do NOT set the menu to
  `position:relative` (collapses to content height, canvas bleeds through).
- **Grapple hook** (player-only mobility, `F` / 🪝 button, press again to release): `castGrapple`
  marches along the aim and anchors on the first building edge (`grappleAnchor`, 430px range).
  `updateGrapple` is a unilateral spring-damper — radial-only force (`GRAPPLE.k`·stretch −
  `GRAPPLE.c`·v_radial, never pushes) so tangential momentum is conserved; rest length reels in
  at 230px/s (does work → speeds you up); auto-release near the anchor or after 2.6s; release
  keeps full velocity. While grappled the normal move lerp/friction is bypassed (input = light
  steering, 520px/s²). Tunables in `GRAPPLE`; rope drawn taut/sagging before bullets.
- **Firing feel**: `bulletFx(w)` drives per-weapon shot juice — tracer colour/width/tail/glow/tip,
  muzzle-flash radius (`h.muzzleR`, scaled in `drawHuman`), recoil kick, spark count/spread,
  knockback push, and player screen-shake for heavy guns (Sniper/Shotgun/Magnum). Shotgun ejects a
  red shell. Bullets carry `lw/tl/glow/tip` (draw loop reads them with fallbacks).
- **Art pass 3**: richer `drawGun` (per-weapon stocks/mags/sights, revolver cylinder, scope+bipod,
  shotgun pump, flame tank+pilot, crossbow bolt, drum, metallic sheen) — shows in-game AND on the
  weapon cards (`weaponIcon`, now extent-centered). Characters: neck, collar arc, shoulder/belly
  shading, head rim-light, shoe shine (`drawHuman`); zombies: rim light + torn hem.
- **Balance & feel pass**: Endless Horde now ramps every wave — `hordeScale` grows zombie HP
  (+9%/wave), damage (up to +120%), and speed (up to +45%); `hordeKind` shifts the mix toward
  runners then brutes; spawn cap raised 26→32. Low-health feedback: a pulsing red "breathing"
  vignette under 30% HP that intensifies toward death, plus a `heart` heartbeat sfx that quickens
  as HP falls (`heartT` cadence in `updatePlayer`).
- **Graphics pass 2**: checkered mowed-lawn ground texture (cached 256px pattern tile per
  time-of-day, seeded speckles/blades), animated water (sand shore, shallow layer, drifting
  ripples, glint), swaying tree canopies, shockwave `rings[]` on explosions / lightning hits /
  supply-drop landings.
- **Game-updated notification**: `GAME_VERSION` + `CHANGELOG` consts (top entry = newest) near the
  data tables. `maybeShowWhatsNew()` at boot: brand-new players (no seenver, 0 matches, lvl 1) get
  silently stamped; returning players see the `#whatsnew` modal (🎉 burst, gold version chip,
  feature cards) once per version — dismissing stamps `dd2_seenver`. Footer "vX · what's new" link
  (`#verLink`) reopens it anytime. **Bump GAME_VERSION + add a CHANGELOG entry when shipping
  player-visible changes.**
- **Character upgrade pass 3** (drawHuman): body **lean** into the run (rotate by vx, shadow stays
  flat), **second arm** — support hand on the foregrip for two-handed guns, free swinging/hanging
  back arm for Pistol/Magnum (`oneHand`), **idle breathing** (time-based bob via per-entity
  `seed` added in makeHuman), **blink** every ~3.4s, **pupils track aim**, **low-HP face** (<30%:
  knit brows, gritted mouth, looping sweat drop), **belt + gold buckle** on all outfits and a
  studded **bandolier** on heavies (avatar.health>=118), and `stepDust(h,dt)` foot-dust puffs
  (called from updatePlayer + updateBot; guards on speed² > 3600). Verify with the scratchpad
  lineup harness: hook pins a row of avatars w/ different weapons + a 20%-hp one in front of the
  camera (grace=999 freezes firing → giant "999" GET READY text in shots is a test artifact).
- **Achievements** (14 badges): `ACHIEVEMENTS` table near `saveMeta` — each `{id,icon,name,desc,test(meta,ctx)}`.
  Career tests read `meta` (wins/ckills/bestStreak/bestWave/matches/level); per-match feats read a
  `ctx` built in `showResults` from `killsTotal` + `matchStat` ({dmgTaken,grappled}, reset in
  `spawnMatch`, fed by `hurt` for player dmg and `castGrapple` for grapple use). `checkAchievements(ctx)`
  runs after career stats save in `showResults`, adds newly-passed ids to `meta.achieved` (persisted as
  `dd2_ach` comma string), and staggers a "🏅 X unlocked!" toast per unlock. UI: a `🏅 Achievements N/14`
  button on the start screen (count set in `renderStats`) opens the `#achievements` `.modal` — a
  `.achgrid` of `.achcard`s (unlocked = white + icon + green ✓, locked = dashed/grey + 🔒). Reuses the
  modal scroll + sticky-Close fix, so the badge wall scrolls on short screens.
- **Modal overflow fix**: `.modal` (Settings/Results) now uses `justify-content:safe center` +
  `overflow-y:auto` so it centers when it fits and top-anchors + scrolls when the content is
  taller than the viewport (portrait / short-height phones). Before, `justify-content:center`
  with no scroll clipped the top of the list and put the Close button off-screen. Verified
  headless at 430×480 (overflow → heading anchored at top, Close reachable via scroll).
- **Automation** (`.claude/`): PostToolUse parse-check hook on `index.html`, SessionStart
  readiness check, permission allowlist. Plus `scripts/parse-check.mjs` + `scripts/validate.mjs`.
  ⚠ Hooks activate only after `/hooks` reload or a session restart (the `.claude/` dir was
  created mid-session).
- **Zombie animation pass (v1.8.0)**: `drawZombie` caught up with the human pass — per-zombie
  `seed` (makeZombie), **lurch lean** (`ctx.rotate` after the flat shadow: forward pitch into
  `flip` + uneven `walk*0.5`+`walk` stagger; gentle sway when idle), **reaching front arm** that
  paws with the shamble + **dragging back arm** with knuckles trailing near the ground (both get
  hand blobs), idle breathing sway on `bob`, and **dirt puffs** in `updateZombie` (speed² > 2500,
  rate & spread scale with `z.size`, `inView`-guarded). Verified via scratchpad hook spawning all
  3 kinds beside the player.
- **Portrait sync (v1.8.0)**: `portraitChibi` now draws the character-pass-3 torso details —
  belt + gold buckle on everyone, studded bandolier on heavies (`av.health>=118`), collar arc —
  so grid/menu portraits match in-game chibis.
- **Coins & shop (v1.8.0)**: `meta.coins` (dd2_coins) earned at match end (5/kill, +25 win,
  +4/wave in horde), from achievement tiers, and the daily. `SHOP_ITEMS` = 6 cosmetic **trails**
  (150–500 🪙; colors fed to `spark` from `updatePlayer`, player-only, speed-gated like stepDust);
  `meta.owned`/`meta.trail` persist (dd2_owned/dd2_trail). `#shop` modal (reuses `.modal` +
  `.achcard` rows, delegated `data-shop` clicks): buy → auto-equip, tap owned → equip, "No Trail"
  free. Coin badge (`#menuCoins`) sits in the start-screen level row.
- **Tiered achievements (v1.8.0)**: `ACHIEVEMENTS` grew 14→21, each with `tier:
  bronze|silver|gold` (`TIER_COINS` 25/75/150 paid on unlock; existing ids/saves unchanged). New:
  champ15, streak5, wave15, matches50, kills500, lvl20, daily3. Grid shows tier left-border +
  medal chip + coin reward; header counts per-tier medals.
- **Daily challenge (v1.8.0)**: one deterministic challenge/day (`todaysDaily()` hashes
  `dayKey()` into `DAILIES[7]`; tests reuse the achievements match-ctx, which now also carries
  `wave` + `time`). `checkDaily` in `showResults` pays 60 🪙 once/day (dd2_daily = day-key,
  dd2_dailies counts for the daily3 badge). Start screen shows a `#dailyCard` (✅/DONE state).
- **Results unlock banner (v1.8.0)**: `#rUnlocks` strip between stat tiles and the XP bar —
  always a "🪙 +N coins" chip, plus a tier-bordered row per fresh achievement and a green
  "📅 Daily complete" row (`.runlocks:empty` hides it outside matches).

## How to run / validate / deploy
- The stage **fills the whole viewport** on every device (`resize()` sets `#game` to
  `window.innerWidth/Height` in JS — never CSS `min()/calc()`, which iOS collapses to 0).
- **Play**: `https://raw.githack.com/Deegan4/last-pulse/main/index.html` (repo is **public**);
  add a `?v=...` cache-buster after pushing. A **Vercel** integration is connected
  (`kollins-projects/last-pulse`) and auto-deploys `main` + PR branches on push — its deployment
  is the "CI" status check on PRs. GitHub Pages remains an option but needs the one-time
  user-side toggle (Settings → Pages → `main` / root).
- **Validate**: `node scripts/validate.mjs` (parse-checks both script blocks), then drive the
  real game headless with `.claude/skills/run-brawl-arena/driver.mjs --play [--mode m --shoot]`
  (bundled Chromium + global playwright, ~430×932; fails on any page error). Read the PNGs.
  For closure-scoped internals, awk-inject a `window.__hook` into a **throwaway copy** — never
  commit hooks (`grep -c "window.__" index.html` → 0).
- **Deploy**: work on branch `claude/skills-37sg64`, push, open a **draft PR**. Direct
  `git push origin main` fails with **HTTP 503** (persistent) — when the user says "push to
  main", mark the PR ready and **merge via the GitHub API** (rebase method), then re-sync:
  `git fetch origin main && git checkout -B claude/skills-37sg64 origin/main` (+
  `--force-with-lease` on the next branch push; the branch holds only already-merged history).
  The API rebase-merge stamps GitHub's committer → merged commits show "Unverified" and the
  stop-hook flags them; it's cosmetic — do NOT rewrite `main` over it.

## Gotchas / constraints (learned the hard way)
- **Network allowlist** blocks `stickygames.com` and most third-party hosts — can't fetch the
  reference; the look is reconstructed from user screenshots.
- **iOS Safari**: never size the stage with CSS `min()/calc()` viewport math — it collapses to
  zero (blank page). `resize()` computes the stage size in JS; phones fill the screen, desktop
  letterboxes a portrait column.
- **githack caches** (incl. 404s) for a few minutes — always hand out a fresh `?v=` link.
- **Headless FPS is software-rendered** (`--disable-gpu`) so it under-reads vs real devices;
  treat it as a pessimistic lower bound, not the on-phone number.
- I **cannot** change repo visibility or enable Pages (no tool); those are user-side toggles.
- Headless tests use a dumb scripted player that dies fast — not a real balance signal; a
  competent kiting run is the check. Use a temporary `window.__hook` in a throwaway copy for
  verification and **never commit hooks**.
- **Meshy 3D assets are blocked in this session**: no `MESHY_API_KEY` in the env and the Meshy
  MCP needs interactive OAuth. 3/28 manifest assets generated (alex, zombie-normal, pistol).
  Unblock: user adds `MESHY_API_KEY` to the environment config (never paste keys into chat) or
  authorizes the MCP in an interactive session, then `node scripts/gen-meshy.mjs`.
- The three.js CDN (unpkg) is blocked headless, so the 3D path can only be verified in a real
  browser over http(s) — the 2D fallback is the tested path.

## Next enhancements
**The forward plan now lives in [ROADMAP.md](ROADMAP.md)** — versioned feature bundles
(v1.11 "Alive World" → v1.13 "Modes & Bosses"), the balance/tuning knob table, and the parked
moonshots (Meshy 3D — still blocked on `MESHY_API_KEY` —, online, leaderboards, PWA). Keep
ROADMAP.md checked off / re-prioritized as things ship; this file stays the record of what
already landed.

## Open questions for the user
- Real on-phone feel: movement speed, fire cadence, zombie pressure, weapon balance, and the new
  v1.8.0 shop/daily/coin flow — needs playtest feedback to tune (are trail prices fair?).
- Batch several changes per `GAME_VERSION` bump, or bump every ship? (Currently: bump per ship.)
- Provide `MESHY_API_KEY` via environment config to unblock 3D character generation?
