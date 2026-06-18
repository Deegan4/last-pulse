# Brawl Arena — Game Design Prompts

A working set of brainstorming prompts to shape what **Brawl Arena** becomes. These
are deliberately open-ended — answer the ones that spark something, ignore the rest.
The goal is to lock a clear **core loop** and **vibe** before writing gameplay code in
`App.tsx`.

Target platform reminder: a **portrait, touch-first** mobile game running in **Expo Go**.
That constrains controls (thumbs, not keyboards), session length (minutes, not hours),
and screen real estate. Let those constraints sharpen the ideas below.

---

## 1. The one-sentence pitch

- In one sentence: what is Brawl Arena and why is it fun? ("A ___ where you ___ to ___.")
- If a friend played for 30 seconds, what's the single moment that makes them say "again"?
- What feeling are we selling — chaos, mastery, tension, silliness, power fantasy?
- Name three existing games it borrows from, and the one thing it does differently.

## 2. Core loop

- What does the player *do* second-to-second? (move, dodge, aim, time a tap, combo?)
- What's the 30-second loop? The 5-minute session? The reason to open the app tomorrow?
- Win condition: last one standing? Highest score? Survive N waves? Beat a rival?
- Lose condition: how does a run end, and does losing feel fair (telegraphed) or cheap?
- Where's the skill ceiling — what separates a new player from a great one?

## 3. Genre & format

Pick a lane (or deliberately blend two):

- **Twin-stick survival** — move + auto/aim-fire against waves (closest to the old project).
- **One-button brawler** — timing/rhythm taps, easy to learn, hard to master.
- **Arena auto-battler** — draft a squad, watch them brawl, tweak between rounds.
- **Physics party brawl** — wobbly fighters, knockback, ring-outs (think Gang Beasts).
- **Roguelite runs** — short runs, permanent meta-progression, build variety.
- **Async PvP / leaderboard** — beat other players' ghosts or scores, no live netcode.

Prompt: which format gives the best *fun-per-line-of-code* for a solo/small build?

## 4. Theme & setting

- What's the fiction? (gladiator pit, food-fight cafeteria, robot scrapyard, cartoon
  monsters, office workers, barnyard animals, gods, slimes?)
- Is the tone serious, cute, absurd, neon-retro, hand-drawn? Pick a reference image vibe.
- Why is everyone brawling? A throwaway reason can give the art and UI personality.
- Does the theme suggest mechanics for free? (e.g. food fight → throwable, splat physics.)

## 5. Characters / fighters

- How many fighters at launch? What makes each one *play* differently (not just look)?
- One axis of difference is enough to start: speed vs. health vs. range vs. a special.
- Is there an unlock arc (start with 1, earn more) or all-unlocked for fairness?
- Signature move per character — what's the "I picked THIS one" payoff?

## 6. Controls (touch-first)

- Movement: virtual joystick, tap-to-move, swipe-dash, tilt, or auto-move?
- Action: auto-attack, hold-to-charge, tap-to-strike, drag-aim-release?
- Constraint: thumbs cover the bottom corners — keep critical UI out of those zones.
- What's the *minimum* number of inputs that still feels expressive? (Fewer is better on mobile.)

## 7. The arena itself

- Single screen or scrolling? A fixed portrait arena is simplest and reads well on phones.
- Hazards: shrinking safe zone, lava, spikes, moving walls, falling objects?
- Does the arena change over a match (shrink, rotate, flood) to force action?
- Pickups: health, power-ups, weapons, score multipliers — how often, how impactful?

## 8. Progression & replayability

- Between-run rewards: new fighters, cosmetics, stat upgrades, new arenas?
- Is there a meta-currency? What does it buy, and does it ever pay-to-win? (Avoid.)
- Daily reason to return: a daily challenge, rotating modifier, streak, leaderboard reset?
- How do we add content cheaply — data-driven fighters/arenas vs. bespoke code each time?

## 9. Difficulty & feel ("juice")

- How does the game ramp difficulty within a run? Between runs?
- "Game feel" checklist: hit-stop, screen shake, particles, sound on every action,
  damage numbers, satisfying death/ring-out. Which three matter most to nail first?
- What's the failure-recovery loop — can a losing player claw back, or is a lead snowbally?

## 10. Art & audio direction

- Art approach: drawn shapes/canvas, sprite sheets, simple 3D, or asset-pack art?
- A consistent limited palette + one shape language beats lots of mismatched detail.
- Audio: a short looping track + punchy SFX. What instruments/mood fit the theme?
- Can one person produce this art style in a weekend? If not, simplify.

## 11. Scope & MVP

- What is the *smallest* version that's actually fun? (1 fighter, 1 arena, 1 enemy type, 1 win condition.)
- List 3 things to cut from v1 and add later.
- What's the riskiest assumption — the thing that, if not fun, sinks the whole idea?
  Prototype *that* first.

## 12. Open questions to resolve before coding

- [ ] Genre/format locked?
- [ ] Core loop written as one paragraph?
- [ ] Control scheme decided (and thumb-friendly)?
- [ ] MVP feature list (the fun-minimum) agreed?
- [ ] One reference image / mood board for art?
- [ ] The riskiest assumption identified and a plan to prototype it?

---

### How to use this doc

Skim, pick the prompts that excite you, and jot answers inline or in a new
`docs/CONCEPT.md`. Once §11 (MVP) and §2 (core loop) are answered, that's the spec —
we start building it in `App.tsx`.
