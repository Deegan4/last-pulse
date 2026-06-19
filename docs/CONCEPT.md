# Brawl Arena — Concept (Clash-of-Clans-style, v0.2)

A concrete, opinionated direction: **Brawl Arena is a Clash-of-Clans-style base-builder.**
Build and upgrade a base, grow a resource economy that ticks even while you're away, train
an army, and raid enemy bases for loot to fund the next upgrade. Picks are in **bold** with
the runner-up noted so it's easy to push back.

> Scope honesty up front: Clash of Clans is a *large* game. This concept captures its **core
> loop** (build → collect → train → raid → upgrade) in an MVP that one person can build in
> Expo Go. PvP/multiplayer and the deep content tree come later — the MVP raids **AI/preset
> bases** so there's no server to run.

---

## 1. The pitch

> **Brawl Arena is a base-building strategy game: grow your village, defend it with towers
> and walls, train an army, and raid rival bases for gold and elixir to upgrade everything.**

- The "play again / check back" hook: resources tick in real time, build timers finish while
  you're gone — so you reopen to *collect, upgrade, and raid* in a tidy 2-minute session.
- Feeling we're selling: **ownership + steady progression** (my base, getting stronger) plus
  short bursts of **tactical raid tension**.
- Borrows from: *Clash of Clans* (the whole loop), *Boom Beach* (cleaner raids). Different:
  built for quick mobile sessions, single-player-first (no live PvP needed to be fun).

## 2. Core loop (locked)

1. **Collect** — gold mines & elixir collectors have generated resources since you left; tap
   to collect (capped by storage).
2. **Build / Upgrade** — spend resources to place or upgrade buildings; upgrades take **real
   time** and occupy your **builder** (start with 1–2 builders).
3. **Train** — spend elixir to train troops into your army camps (training takes time).
4. **Raid** — attack an enemy base: deploy troops, they auto-fight, you loot a % of their
   resources and earn **1–3 stars** based on destruction.
5. **Upgrade again** — loot funds the next upgrade. Town Hall level gates what you can build.

Session length: **1–3 minutes**. Reason to return: timers + full collectors + a new raid.

## 3. Genre & format (locked)

- **Pick: single-player base-builder with timer economy + troop-deployment raids.** This is
  the CoC loop minus the server. Most of the game is **state + timers + persistence**; only
  the raid phase is real-time.
- Runner-up (later): online PvP raids against other players' real bases — needs a backend
  (matchmaking, base storage, anti-cheat). Out of scope for MVP; design the data model so we
  *could* add it.

## 4. The base & grid (proposed)

- A fixed plot (e.g. **24×24 tiles**). Tap an empty tile to build; tap a building to
  upgrade/move/info.
- **View: top-down square grid for the MVP**, with an **isometric** look as a later visual
  upgrade. Isometric is CoC's signature, but it's much harder to get right (depth sorting,
  hit-testing); a clean top-down grid gets the loop playable far faster. Tradeoff noted.
- Camera: pinch-zoom + pan over the plot.

## 5. Buildings (MVP set)

Keep it small but complete enough that the loop works:

- **Town Hall** — the heart; its level gates everything and unlocks higher building tiers.
- **Gold Mine** / **Elixir Collector** — generate resources over time.
- **Gold Storage** / **Elixir Storage** — cap how much you can hold; also what raiders loot.
- **Builder's Hut** — each one = one concurrent build/upgrade (start with 1–2).
- **Army Camp** — houses trained troops (caps army size).
- **Barracks** — trains troops (costs elixir + time).
- **Cannon** / **Archer Tower** — **defenses** that auto-target attackers during a raid.
- **Walls** — cheap tiles that slow/funnel attacking troops.

Roadmap buildings: more defenses (mortar, traps), more resource tiers, laboratory (troop
upgrades), clan/social building.

## 6. Resource economy (locked)

- Two currencies: **Gold** (defenses/walls/town hall) and **Elixir** (troops/resource
  buildings). A premium **Gems** currency (speed-ups) is a *later* monetization hook — not MVP.
- **Offline generation:** store a `lastCollected` timestamp per collector; on app open,
  `produced = rate × elapsed`, clamped to capacity. Same pattern for finishing build/train
  timers — compute against wall-clock so progress happens while the app is closed.
- Storages set the ceiling and define **lootable** amounts when you're raided.

## 7. Army & troops (MVP set)

- **3 starter troops**, each one role so they feel different:
  - **Grunt** (melee, cheap, swarms) — attacks nearest building.
  - **Archer** (ranged, fragile) — hits over walls.
  - **Bruiser** (tanky, slow, targets defenses first) — soaks damage.
- Training: queue troops at the Barracks (elixir + time); they fill Army Camps up to capacity.
- Later: troop *upgrades* (laboratory), spells, more unit types.

## 8. Raids / combat (locked, the only real-time part)

- **Pick an opponent** — for MVP, a small set of **handcrafted/AI-generated enemy base
  layouts** scaled to your Town Hall level (no live players needed).
- **Deploy phase:** tap around the edge of the enemy base to drop troops from your trained army.
- **Auto-combat:** troops **auto-path to and attack** targets (per their AI: nearest building,
  or defenses-first); **defenses auto-fire** back. You watch and choose *where/when* to deploy
  — that's the tactic.
- **Scoring:** **1–3 stars** (e.g. 50% destruction = 1★, Town Hall destroyed = +1★, 100% = +1★)
  and you **loot a percentage** of the enemy's available gold/elixir.
- **Timer:** a short battle clock (e.g. 90s); raid ends on timeout, total wipe, or your call.

## 9. Progression

- **Town Hall level** is the spine: each level unlocks new buildings, higher upgrade tiers,
  and more builders.
- Upgrades cost more gold/elixir and longer timers as you climb — the classic "save up for the
  big one" arc.
- A simple **single-player campaign** of preset bases gives raid content without multiplayer.

## 10. Art & audio

- **Art:** code-drawn tiles + simple building shapes/sprites; one cohesive palette. Buildings
  read by silhouette + color. No isometric art required for the top-down MVP.
- **Audio:** ambient village loop + SFX for collect, place, upgrade-complete, troop-deploy,
  defense-fire. Add after the loop is fun.

## 11. MVP — the fun-minimum (build this first)

Enough of the loop to feel like the real game:

1. A base grid you can **place buildings** on (Town Hall, 1 mine, 1 collector, 2 storages,
   1 cannon, 1 army camp, 1 barracks, walls).
2. **Resource generation + offline accrual + collect** (gold & elixir).
3. **Build/upgrade with real-time timers** gated by a single builder.
4. **Train 1–2 troop types** with timers, capped by army camp.
5. **One raid** against a preset enemy base: deploy troops, auto-combat, defense fires back,
   compute **stars + loot**, return loot to your base.
6. **Town Hall level** gating at least one new building.
7. **Local persistence** (AsyncStorage) so the village + timers survive app restarts.

**Cut from v1** (add later): isometric view, gems/IAP, online PvP, clans/social, spells, the
full building/troop tree, traps, hero units.

## 12. Riskiest assumption (prototype this *before* the rest)

> Does the **timer + offline-economy + "collect/upgrade/raid in 2 minutes"** loop feel
> satisfying when most of it is *waiting*?

De-risk fast: build the **economy slice first** — place a collector, generate resources over
real (and simulated/offline) time, collect them, start a timed upgrade, and have it finish
while the app is backgrounded. If *that* feels rewarding, the raid layer is additive. If the
waiting feels dead, we tune rates / add the raid sooner before investing in content.

---

## Tech notes for the build

- **State & persistence:** model the village as a serializable state tree (buildings with
  `type`, `level`, `tile`, `lastCollected`, and `upgradeFinishAt`). Persist to
  **`@react-native-async-storage/async-storage`**; recompute economy/timers against
  `Date.now()` on load and on app foreground (`AppState` listener).
- **Timers:** never trust `setInterval` alone for long timers — store **absolute finish
  timestamps** and reconcile on resume, so closing the app doesn't pause progress.
- **Raid loop:** the battle phase needs a real-time loop (`requestAnimationFrame` /
  Reanimated frame callback); keep troop/building entities in refs, render via transforms,
  avoid per-frame React re-renders. The base-building screens are ordinary React state.
- **Rendering:** plain `View`s/`Animated` for the MVP grid; evaluate `react-native-svg` or
  `react-native-skia` only if the raid needs many moving sprites. Verify Expo Go support at
  v56 before adding any native lib.
- **Data-driven content:** define buildings/troops/costs/timers as config objects so new
  content is data, not code — and so we can later swap preset bases for server-fetched ones.

Next step: thumbs-up the locked items (§2, §3, §6, §8) and the MVP list (§11), and I'll start
with §12's **economy slice** in `App.tsx` (place collector → generate → collect → timed
upgrade that survives a restart).
