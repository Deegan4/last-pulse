# Brawl Arena — Concept (Proposed Direction v0.1)

This is a concrete, opinionated answer to `docs/GAME_DESIGN_PROMPTS.md` — a starting
point to react to, not a final spec. Where a real choice exists, the **pick** is in bold
with the runner-up noted so it's easy to push back.

---

## 1. The pitch

> **Brawl Arena is a one-thumb survival brawler: you dodge through a shrinking neon
> arena while your fighter auto-swings at the swarm closing in — survive, level up, and
> beat your best time.**

- The "play again" moment: a near-death escape — one sliver of health, threading between
  enemies, grabbing a power-up, and the wave clears. Pure relief → "again."
- Feeling we're selling: **escalating tension + power fantasy**. Starts easy, becomes a
  glorious losing battle.
- Borrows from: *Vampire Survivors* (auto-attack survival), *.io* arena games (one-thumb
  control), classic arena shooters (shrinking safe zone). Different: built for **10-second
  pick-up-and-play** sessions on a phone, one thumb, portrait.

## 2. Core loop (locked)

- **Second-to-second:** drag to move; your fighter **auto-attacks** the nearest enemy.
  All the skill is in *positioning and dodging*, not aiming.
- **30-second loop:** survive a wave → gain XP → on level-up, **pick 1 of 3 upgrades** →
  face a harder wave.
- **Run (2–5 min):** survive escalating waves until you die. Score = **time survived +
  kills**. Earn coins for the meta layer.
- **Return tomorrow:** beat your high score + a **daily modifier** (e.g. "double enemies,
  double coins").
- **Lose:** health hits 0. Always telegraphed — enemies have a wind-up, damage flashes.

## 3. Genre & format (locked)

- **Pick: single-thumb auto-attack survival roguelite.** Best *fun-per-line-of-code* —
  the player only controls movement, so no aiming UI, no combo system, no netcode.
- Runner-up: twin-stick (move + aim). More expressive, but two thumbs + an aim stick is
  fiddly in portrait and roughly doubles the input/feel work. Start with one thumb; we can
  add a manual "special" button later.

## 4. Theme & setting (proposed)

- **Pick: "Scrap Brawlers" — cute battle-bots fighting in a neon colosseum.** Simple
  geometric robots (circles/triangles with eyes), bright limited palette on a dark arena
  so everything reads at a glance.
- Why: shapes are cheap to draw in code (no sprite artist needed for MVP), the neon-on-dark
  palette makes "juice" (glows, particles) pop, and bots justify endless respawning enemies.
- Runner-up: cartoon monsters / slimes (same shape-based art, swap the skin later).

## 5. Fighters (MVP + roadmap)

- **MVP: 1 fighter** — "Rookie": balanced speed/health, fast short-range swing.
- Roadmap fighters differ on **one axis each** so they actually play differently:
  - *Tank* — slow, high health, heavy knockback.
  - *Scout* — fast, low health, long-range whip.
  - *Bomber* — average, attack is an AoE pulse instead of a swing.
- Unlock arc: earn fighters with coins. Stats only — **never pay-to-win**.

## 6. Controls (locked, touch-first)

- **Floating joystick:** touch anywhere on the **bottom 60%** of the screen to spawn a
  stick; drag to steer. Release = stop. No fixed on-screen buttons in v1.
- Attacks are **automatic** (nearest enemy in range). One input total — maximally mobile-friendly.
- Later: an optional **special** on a cooldown, triggered by a tap with the off-thumb.

## 7. The arena (proposed)

- **Fixed portrait arena**, no scrolling — the whole fight is on one screen, reads perfectly on a phone.
- **Shrinking ring of "lava"** creeps in from the edges over the run, forcing players toward
  the center and into the swarm. This is our pacing/anti-camping mechanic.
- Pickups drop from kills: **health orbs** (rare), **coins** (common), occasional **power-up**.

## 8. Progression & replayability

- **In-run:** level-up → choose 1 of 3 upgrades (e.g. +attack speed, +move speed, bigger
  swing, pierce, lifesteal). Build variety = replay value.
- **Meta:** coins → unlock fighters + small permanent perks (a modest starting-stat shop).
- **Daily:** a rotating modifier + a leaderboard-style "beat your best" streak. (Local high
  score first; online leaderboard is a later, optional add.)

## 9. Difficulty & feel ("juice")

- Difficulty ramps **within a run** by enemy count/speed and ring shrink; **between runs**
  the meta perks let you push further.
- **Three juice priorities to nail first:** (1) hit-stop + flash on every hit, (2) screen
  shake on death/level-up, (3) a satisfying pop + particles when an enemy dies. These three
  do most of the "feel good" work.

## 10. Art & audio

- **Art:** code-drawn shapes (React Native `View`s or `react-native-svg` / canvas), one
  limited neon palette, consistent rounded shape language. No external art needed for MVP.
- **Audio:** one short looping track + punchy SFX (hit, kill, level-up, death). Add after
  the loop is fun — silence is fine for the first prototype.

## 11. MVP — the fun-minimum (build this first)

One fighter, one arena, the core loop, nothing else:

1. A draggable fighter on a fixed portrait arena.
2. Enemies spawn at the edges and walk toward the player.
3. Auto-attack: damage the nearest enemy in range on a timer; enemies die + particle pop.
4. Player health; contact with an enemy deals damage; **0 HP = game over**.
5. Score = survival time + kills; show it, and persist a **local high score**.
6. Level-up → **pick 1 of 3 upgrades**.
7. Start screen → play → game-over → retry.

**Cut from v1** (add later): extra fighters, the shrinking ring, daily modifier, audio,
online leaderboard, special abilities.

## 12. Riskiest assumption (prototype this *before* anything else)

> Does **one-thumb, auto-attack, dodge-the-swarm** survival actually feel good in a
> 60-second loop on a phone?

Prototype order to de-risk it fast: **movement (drag) → enemy spawn + chase → auto-attack +
enemy death → player death/game-over.** If those four feel fun with zero art and zero
upgrades, the concept is sound and everything else is additive. If not, we rethink §3 before
investing further.

---

### Tech notes for the build

- **Game loop / animation:** drive updates with `requestAnimationFrame` (or
  `react-native-reanimated`'s frame callbacks) — avoid React re-renders per frame; keep
  entity state in refs and render positions via transforms.
- **Rendering option to evaluate first:** plain `Animated`/transform `View`s are simplest
  and Expo Go-friendly; consider `react-native-svg` or `react-native-skia` only if shape
  count/perf demands it. Confirm Expo Go compatibility for any native lib at v56 before adding.
- Keep fighters/enemies/upgrades **data-driven** (config objects) so new content is data, not code.

Next step: thumbs-up the locked items (§2, §3, §6, §7) and the MVP list (§11), and I'll
start building the prototype in `App.tsx` from §12's order.
