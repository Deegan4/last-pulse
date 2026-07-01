<div align="center">

# 🧟 LAST PULSE

### A portrait, mobile-first, cartoon **twin-stick survival royale** — the entire game in one `index.html`.

Pick a character, pick a gun, drop into a field of 15. Outlast the other players, the roaming zombies, and the closing safe zone. **Last one standing wins.**

## ▶ &nbsp; [CLICK HERE TO PLAY](https://rawcdn.githack.com/Deegan4/last-pulse/886d466437fad26d2c5bb874602614e40ef5194e/index.html) &nbsp; ◀

<sup>opens the game in your browser — no install, no sign-up · for a permanent URL see [Play](#-play)</sup>

[![▶ Play Now](https://img.shields.io/badge/▶_PLAY_NOW-online-44cc11?style=for-the-badge&logo=gamejolt&logoColor=white)](https://rawcdn.githack.com/Deegan4/last-pulse/886d466437fad26d2c5bb874602614e40ef5194e/index.html)
&nbsp;
![HTML5 Canvas](https://img.shields.io/badge/HTML5-canvas-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![Single file](https://img.shields.io/badge/single_file-no_build-blue?style=for-the-badge)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

<br/>

<img src="docs/img/start.png" alt="Last Pulse title screen" width="300" />

<table>
<tr>
<td align="center"><img src="docs/img/combat-horde.png" alt="Endless Horde combat" width="270" /><br/><b>🧟 Endless Horde</b> — survive escalating waves</td>
<td align="center"><img src="docs/img/combat-br.png" alt="Battle Royale, safe zone closing" width="270" /><br/><b>🏆 Battle Royale</b> — outlast the shrinking zone</td>
</tr>
</table>

</div>

## ▶ Play

### ⭐ Best link — enable GitHub Pages once (2 clicks)

The repo is already Pages-ready (`index.html` at root + `.nojekyll`). This gives a fast, permanent URL that never breaks:

1. Repo **Settings → Pages**
2. **Source: Deploy from a branch** → **Branch: `main`** → **Folder: `/ (root)`** → **Save**

Then play at **`https://deegan4.github.io/last-pulse/`** — it rebuilds automatically on every push to `main`.

### Play right now (no setup)

These use free third-party proxies for the public `index.html`. If one shows a blank page or error, give it a minute (they cache briefly after a push) or try the next:

- **Latest:** <https://raw.githack.com/Deegan4/last-pulse/main/index.html>
- **Pinned (most reliable):** <https://rawcdn.githack.com/Deegan4/last-pulse/886d466437fad26d2c5bb874602614e40ef5194e/index.html>
- **Backup:** [open via htmlpreview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Deegan4/last-pulse/main/index.html)

On a laptop you can also download [`index.html`](index.html) and open it in any browser — no server, no build step, no dependencies.

## ✨ Features

- 🎮 **Twin-stick controls** — dual virtual joysticks on touch, `WASD` + mouse on desktop, plus gamepad support.
- 🏆 **Three modes** — **Battle Royale** (15 players, shrinking zone), **Endless Horde** (escalating zombie waves), and **Squads** (last team standing).
- 🧟 **Three zombie types** — `normal`, fast `runner`, and tanky `brute` — that get tougher, faster, and meaner every Horde wave.
- 🔫 **10 weapons** — Pistol (crit), Rifle, Shotgun, SMG, Magnum, Sniper (pierce), Crossbow, Flamethrower (burn DoT), Minigun, and the drum-mag Tommy — each with its own ammo, reload, range, and feel.
- 🦸 **15 unlockable avatars** — each with distinct speed / health stats and a hand-drawn cartoon look (cyber visor, top hat, crown, mohawk, ninja…), gated behind your level.
- 📦 **Loot & supply drops** — health, medkits, armor, ammo, and weapon swaps, plus parachuting crates with a strong gun + armor.
- ⚡ **Power-ups** — chain-lightning, a throwable AoE bomb, and a 🪝 **grapple hook** (fire at a building, get reeled in on an elastic rope that conserves your swing momentum — release keeps your speed).
- 🩸 **Game feel** — hit markers, kill-streak callouts, blood splats, damage-direction indicators, muzzle flash, recoil, brass casings, screen shake, a **#1 VICTORY** confetti screen, and a low-health heartbeat.
- 🌅 **Living arena** — a 3000² map with buildings (cover), ponds, animated water, swaying trees, a checkered lawn, and day / dusk / night lighting.
- 📈 **Progression** — XP, levels, and career stats (wins / matches / kills / K-D / best placement / streak).

## 🎮 Controls

| Action | Touch (mobile) | Keyboard / Mouse (desktop) |
|---|---|---|
| Move | Left stick | `WASD` / arrow keys |
| Aim & fire | Right stick (auto-fire) | Mouse aim · click or `Space` to fire |
| Reload | automatic | `R` |
| ⚡ Lightning | ⚡ button | `Q` |
| 💣 Bomb | 💣 button | `E` |
| 🪝 Grapple | 🪝 button | `F` (again to release) |

## 🛠 Development

Everything — markup, styles, and game logic — lives in a single [`index.html`](index.html). No build system, no package manager, no dependencies.

```sh
# play / iterate: just open it
open index.html                    # or: python3 -m http.server 8000

# syntax-check the script block (fast, no execution)
node scripts/validate.mjs
```

Want to drive it headlessly (launch, play a match, screenshot, smoke-test)? There's a ready-made skill at [`.claude/skills/run-brawl-arena/`](.claude/skills/run-brawl-arena/):

```sh
node .claude/skills/run-brawl-arena/driver.mjs --play --mode horde --shoot
```

See [CLAUDE.md](CLAUDE.md) for architecture notes and [memory.md](memory.md) for the running design log.

<div align="center"><sub>A from-scratch canvas remake inspired by the StickyGames title <em>Don't Die</em> — all art is drawn with canvas shapes, no original sprites.</sub></div>
