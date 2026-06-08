# Don't Die — Battle Royale

A single-file, portrait, mobile-first cartoon **twin-stick survival royale** (HTML5 canvas). Pick a character, pick a weapon, drop into a field of 15, survive the shrinking safe area and the zombies — last one standing wins.

## ▶ Play

### **[▶ TAP HERE TO PLAY](https://raw.githack.com/Deegan4/brawl-arena/main/index.html)**

Backup link (if the one above is blank): **[open via htmlpreview](https://htmlpreview.github.io/?https://raw.githubusercontent.com/Deegan4/brawl-arena/main/index.html)**

> Tip: on a phone, just tap the **Play** link above. On a laptop you can also download `index.html` and open it in any browser — it needs no server or build step.

## How to play

- **Pick an avatar** (Speed/Health stats, more unlock as you level up) and a **weapon** (Pistol / Rifle / Shotgun / Sniper, each with its own ammo, reload, and special).
- **Survive** the shrinking *safe area* and the roaming zombies while out-gunning 14 other players.

**Touch (mobile):** left stick = move, right stick = aim & fire, ⚡ = lightning, 💣 = bomb.

**Keyboard (desktop):** `WASD`/arrows = move, mouse = aim, click/`Space` = fire, `R` = reload, `Q` = lightning, `E` = bomb.

## Development

Everything — markup, styles, and game logic — lives in [`index.html`](index.html). No build system, no dependencies. Syntax-check with `node scripts/parse-check.mjs`. See [CLAUDE.md](CLAUDE.md) for architecture notes.
