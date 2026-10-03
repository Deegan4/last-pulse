# Last Pulse architecture

The native app is Swift/UIKit + WKWebView, with SwiftData saves and StoreKit purchases.
The canvas game is authored in `src/` and bundled locally into the app. A web build uses
the same sources and assets. No network or npm install is required to assemble the app.

## Edit sources, build outputs

- `src/index.html`: markup and local resource links.
- `src/styles/game.css`: screen layout, controls, safe-area styling.
- `src/game/manifest.json`: explicit source order; missing, duplicate or unlisted JS files fail the build.
- `src/game/{core,data,entities,rendering,combat,world,input,audio,effects,progression,persistence,native,ui}/`: game systems.
- `src/rendering/models3d.js`: optional local Three.js/GLB layer.
- `assets/`: canonical images, models, icons and vendored libraries. `assets/game/` is generated.
- `LastPulseIOS/LastPulse/`: native lifecycle, saves, purchase manager and web-view bridge.

`python3 scripts/build-game.py` produces root `index.html`, `assets/game/game.js`,
`game.js.map`, `game.css`, and `models3d.js`, plus a local `LastPulseIOS/GameContent/`
preview. Commit the five web outputs so static hosting works without a server build.
Never edit generated outputs or maintain another native copy by hand.

The source units currently share one private IIFE scope. The builder concatenates them
in manifest order, retaining the existing declaration/initialization semantics and
avoiding global variables. These are organized source files, not independent ES modules.
Source maps embed the original files for debugging. Explicit state/module interfaces
can be introduced in a later refactor with focused behavior tests.

## Xcode packaging

Open `LastPulseIOS/LastPulse.xcodeproj`. The **Build Shared Game** shell phase runs:

```sh
/usr/bin/python3 "$SRCROOT/../scripts/build-game.py" --ios-only \
  --ios-output "$TARGET_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/GameContent"
```

It assembles directly from `src/`, copies canonical assets and the web manifest, and
writes to the target product before code signing. Debug, Release and archive use the
same path. The phase runs every build, only rewrites changed files, and removes only
obsolete files recorded in its generated inventory. It does not copy stale web output.
`GameViewController.loadFileURL` grants access to the entire GameContent directory, so
external CSS, scripts and assets resolve locally. Module imports are relative to the
external 3D script; image/GLB paths remain relative to the document.

`project.yml` contains the equivalent XcodeGen configuration. User script sandboxing is
disabled for this target because the source/asset inventory crosses SRCROOT and writes
to the product directory; this is a build setting, not an app runtime entitlement.

## Verification

```sh
python3 scripts/build-game.py
python3 scripts/build-game.py --check
python3 scripts/test-build.py
node scripts/validate.mjs
node .agents/skills/run-brawl-arena/driver.mjs --play --mode horde --shoot
node scripts/test-perks.mjs
node scripts/render-enemies.mjs
```

Set `CHROME_BIN` to installed Chrome if Playwright's bundled browser is unavailable.
For Xcode installed outside the selected developer directory, set `DEVELOPER_DIR` on
the build command. Simulator tests verify packaging and runtime; physical-device,
StoreKit sandbox, signing and App Store submission checks are separate release work.

Test helpers materialize the external runtime into disposable HTML before injecting
closure-scoped hooks. Production source files must not gain test-only hooks.
