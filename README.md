# Brawl Arena

A mobile game built with [Expo](https://expo.dev) (React Native + TypeScript),
designed to run in **Expo Go**.

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

## Project layout

- `App.tsx` — the root component / game screen
- `index.ts` — app entry point (`registerRootComponent`)
- `app.json` — Expo app config (name, icons, orientation)
- `assets/` — app icons and splash image

Start building the game in `App.tsx`.
