# Last Pulse — iOS WKWebView Wrapper Design

Date: 2026-07-01

## Goal

Ship "Last Pulse" (the canvas game in `index.html`) as an installable iOS app,
distributable via TestFlight to a small group of testers, with minimal native
touches: haptics on hits/kills and a Game Center leaderboard for best match
placement.

## Approach

Wrap the existing, unmodified game in a native SwiftUI shell that loads
`index.html` from the app bundle into a `WKWebView`, entirely offline (no
network fetch of game assets). This reuses 100% of the existing game logic —
markup, styles, and the single `<script>` IIFE — with no rewrite. A native
rewrite (SpriteKit/SwiftUI+Canvas) or a Capacitor-style bridge were considered
and rejected: both cost weeks of parallel-codebase maintenance for a game that
already has working touch controls, canvas rendering, and WebAudio in the
browser.

## Architecture

A new Xcode project, `LastPulse.xcodeproj` (SwiftUI iOS app target), added
alongside the existing web game in this repo. The web game's files
(`index.html`, and any `scripts/`/`assets/` it references) are added to the
Xcode project as bundled resources (folder reference, so relative paths
resolve the same way they do when served locally today).

Native code is a thin shell: it does not drive gameplay. All game state,
input handling (WASD/mouse on desktop, dual joysticks on touch), audio, and
rendering remain exactly as implemented in `index.html`. The only new
integration surface is a one-way JS → Swift message bridge for two outbound
signals: haptic feedback and Game Center score submission.

## Components

1. **`LastPulseApp.swift`** — App entry point (`@main`). On launch, calls
   `GKLocalPlayer.local.authenticateHandler` to prompt/attach Game Center
   sign-in (non-blocking — gameplay proceeds regardless of auth outcome).

2. **`GameWebView.swift`** — A `UIViewRepresentable` wrapping `WKWebView`.
   Loads `index.html` via `loadFileURL(_:allowingReadAccessTo:)` from the app
   bundle. Configuration: bounce/zoom disabled (`scrollView.bounces = false`,
   disable pinch), background matches the game's dark theme to avoid a white
   flash before content paints, portrait orientation lock (matches the game's
   portrait-only layout). Registers a `WKScriptMessageHandler` under the name
   `native`.

3. **`NativeBridge.swift`** — Implements `WKScriptMessageHandler`. Parses
   incoming messages as JSON with a `type` field:
   - `{type: "haptic", style: "impact" | "success"}` →
     `UIImpactFeedbackGenerator(style: .medium).impactOccurred()` for
     `"impact"`, `UINotificationFeedbackGenerator().notificationOccurred(.success)`
     for `"success"`.
   - `{type: "submitScore", placement: Int}` → if
     `GKLocalPlayer.local.isAuthenticated`, submit `placement` (lower is
     better) to the `bestPlacement` leaderboard via `GKLeaderboard.submitScore`.
     No-op silently if not authenticated (no retry, no queuing — a missed
     submission from a signed-out player is not worth the complexity).

4. **`index.html` bridge hooks** — Small additions at existing call sites:
   - In the damage/kill-feed logic (`hurt`/`die`), call
     `window.webkit?.messageHandlers?.native?.postMessage({type:"haptic",
     style:"impact"})` on the player taking damage, and `style:"success"` on
     the player scoring a kill.
   - On the results screen transition (`screenState = 'results'`), call
     `window.webkit?.messageHandlers?.native?.postMessage({type:"submitScore",
     placement: <computed final placement>})`.
   - All calls use optional chaining (`?.`) so they are harmless no-ops when
     the game runs in a plain desktop/mobile browser — the existing
     `open index.html` / `python3 -m http.server` workflows are unaffected.

5. **App icon + launch screen** — A static launch screen matching the game's
   dark background (no logo animation — keep it simple). App icon: reuse an
   existing brand asset if one exists in `assets/`, otherwise a simple
   placeholder is generated and flagged for the user to replace with final
   artwork before App Store submission.

6. **Game Center leaderboard** — One leaderboard, "Best Placement"
   (identifier `bestPlacement`), configured in App Store Connect, sort order
   ascending (lower placement number = better rank, e.g. "#1" beats "#5").
   Kill count is not tracked as a separate leaderboard in this pass.

## Data Flow

```
index.html (game logic, unchanged)
   │
   │  window.webkit.messageHandlers.native.postMessage(...)
   ▼
NativeBridge (WKScriptMessageHandler)
   │
   ├─ haptic events ──► UIImpactFeedbackGenerator / UINotificationFeedbackGenerator
   └─ score events ───► GKLeaderboard.submitScore (if authenticated)
```

No data flows the other direction — native never injects JS back into the
page. The web game is the single source of truth for all gameplay state.

## Error Handling

- **GameKit auth failure / player not signed in**: `submitScore` checks
  `GKLocalPlayer.local.isAuthenticated` and silently no-ops if false. No user
  facing error, no retry queue.
- **Bundled `index.html` fails to load**: `WKNavigationDelegate` failure
  callback shows a plain SwiftUI fallback view ("Something went wrong loading
  the game") rather than a blank/white screen.
- **Malformed bridge messages**: `NativeBridge` guards JSON parsing and
  ignores messages that don't match the expected `type` field — never
  crashes the app on a bad message.

## Testing

- Manual only, matching this repo's existing no-test-suite convention:
  - Run in iOS Simulator: verify the game loads, plays identically to the
    browser version (movement, aiming, firing, zone shrink, results screen).
  - Run on a physical device: verify touch joysticks work, verify haptics
    fire on hit/kill (Simulator cannot render actual haptics), verify a
    completed match submits to Game Center (checked via the Game Center
    sandbox environment in Settings → Game Center → Sandbox Account).
  - Verify offline: airplane mode, confirm the game still loads and plays
    (leaderboard submission will simply no-op).
- No automated test suite is added — this matches the existing
  `scripts/parse-check.mjs` + manual headless-render validation pattern used
  for the web game; native code here is thin enough that manual verification
  is proportionate.

## Out of Scope (this pass)

- Full native rewrite of any game system.
- Additional native features beyond haptics + one leaderboard (no push
  notifications, no widgets, no App Intents/Siri).
- Kill-count leaderboard (deferred; can be added later as a second
  leaderboard with the same bridge pattern).
- Final App Store submission polish (privacy manifest, full screenshot set,
  App Store Connect metadata) — this design covers getting a working build
  onto TestFlight for a small group of testers, not App Store release.
