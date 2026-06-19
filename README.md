# Forge Kingdom

A Clash-of-Clans-style base-builder, built with [Expo](https://expo.dev)
(React Native + TypeScript) and designed to run in **Expo Go**.

Current build is the **economy + army layer**: gold mines and elixir collectors
generate resources over real time (including while the app is closed), you collect
them, and you spend them on timed building upgrades gated by a single builder and
your Town Hall level. You can also **train troops** at the Barracks — units queue
and train on real timers (catching up offline) and fill your Army Camps up to
capacity. Progress is saved locally, so the kingdom survives an app restart.

See [`docs/CONCEPT.md`](docs/CONCEPT.md) for the full game direction and
[`docs/GAME_DESIGN_PROMPTS.md`](docs/GAME_DESIGN_PROMPTS.md) for the design notes.

## Prerequisites

- [Node.js](https://nodejs.org) (LTS)
- The **Expo Go** app on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

## Getting started

```sh
npm install
npm start
```

This starts the Expo dev server and prints a QR code. Scan it with the Expo Go
app (Android) or the Camera app (iOS) to open the game on your device. Your
phone and computer must be on the same network.

Other entry points:

```sh
npm run android   # open in an Android emulator
npm run ios       # open in an iOS simulator (macOS only)
npm run web       # run in the browser
```

## How to play (economy slice)

- **Collect:** producers show a badge when they have resources ready — tap them to bank it (up to your storage capacity).
- **Upgrade:** tap any building, then **Upgrade** in the bottom panel. Upgrades cost resources, take real time, and need a free builder.
- **Gating:** a building can be at most one level above your **Town Hall** — upgrade the Town Hall to unlock further levels.
- **Train troops:** tap the **Barracks** and train Grunts/Archers/Bruisers (cost elixir + time, capped by Army Camp housing). Higher Barracks levels unlock stronger troops.
- **Offline:** close the app and come back later; production, build timers, and troop training all catch up to wall-clock time.

## Project layout

- `App.tsx` — UI: resource bars, base grid, and the build/upgrade panel
- `src/types.ts` — game data model
- `src/config.ts` — data-driven buildings, levels, costs, and starting base
- `src/economy.ts` — pure economy logic (production, capacity, upgrade timers, offline reconcile)
- `index.ts` — app entry point (`registerRootComponent`)
- `app.json` — Expo app config

## Roadmap

Next up per the concept: the **raid** phase against preset enemy bases — deploy
your trained troops, auto-combat against defenses, and earn stars + looted
resources to bring home.
