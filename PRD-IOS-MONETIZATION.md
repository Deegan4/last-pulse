# PRD — Last Pulse iOS: Revenue

**Owner:** Deegan · **Status:** Draft · **Created:** 2026-09-03
**Scope:** LastPulseIOS wrapper + index.html shop/IAP surface. Not a gameplay PRD — balance/content
changes are in scope only where they gate or drive monetization.

## 1. Where we are

Two StoreKit2 products exist and work today (`StoreManager.swift`):

| Product | ID | Type | Price | Status |
|---|---|---|---|---|
| Unlock Everything | `com.lastpulse.game.unlockall` | non-consumable | TBD in ASC | shipped v2.54.0, gates avatars/weapons + (as of this session) biome ground skins |
| 500 Coins | `com.lastpulse.game.coins500` | consumable | TBD in ASC | shipped, tops up `meta.coins` shop currency |

Neither product has a real price configured in App Store Connect yet — until they are, the
buttons never render (`loadProducts()` finds nothing). There is no subscription, no ad
placement, no second consumable tier, and no App Store listing/screenshot/keyword work done.
A Stripe donate link exists for the web build only (blocked on iOS by Guideline 3.1.1).

**This PRD's job:** turn "two untested IAPs" into a tuned, multi-tier monetization system with
a real ASO plan, before/around the next feature-driven update cycle.

## 2. Goal & non-goals

**Goal:** maximize LTV per install without eroding the free "one good match" experience — the
game must still be fully playable and fun with $0 spent, because App Store discovery punishes
paywalled cores (rejection risk + bad reviews) and because free-to-paid conversion depends on
players reaching the hook before hitting a wall.

**Non-goals:** no pay-to-win stat boosts in Endless Horde (damage/health for cash breaks the
survival-run leaderboard and the game's "skill roguelite" identity — see `ROADMAP.md` design
pillars); no loot boxes / randomized paid rewards (Apple + several app store regs now require
odds disclosure and it's reputational risk for a small indie title); no forced rewarded-video
interstitials that block respawn/menu flow.

## 3. Monetization architecture (target state)

### 3.1 IAP ladder — widen from 2 SKUs to 5

Current gap: a single $X non-consumable "buy everything" has no low-friction entry point and no
whale ceiling. Add:

1. **Starter Pack** (new, non-consumable, ~$2.99) — one avatar + one weapon + 250 coins, sold
   once, first-session-only offer surfaced right after the player's first death (highest-intent
   moment). Classic "impulse buy" tier — priced under the psychological $3 threshold.
2. **Unlock Everything** (existing, keep, reprice) — currently no price set. Target $7.99–$9.99;
   this is the "I'm committed" tier for players who've already unlocked 3+ things via XP and want
   to stop grinding.
3. **Coins 500 / 1200 / 3000** (existing 500 tier + two new consumables) — standard
   diminishing-cost-per-coin ladder (bigger pack = better $/coin) to capture repeat spenders
   instead of capping them at one consumable SKU.
4. **Battle Pass — Season track** (new, consumable-per-season or auto-renewing subscription) —
   biggest revenue lever available and currently entirely absent. Cosmetic-only track (avatar
   skins, weapon skins, kill-feed banners) tied to XP already earned in normal play, so it's a
   monetized progression skin on top of existing systems rather than new content debt.
5. **Remove Ads** — see §3.2; only relevant if ads ship.

### 3.2 Ads — currently zero, evaluate rewarded-only

No ad SDK is integrated. Recommendation: **rewarded video only**, no banners/interstitials
(banners kill perceived quality on a portrait action game; interstitials between matches drive
uninstalls). Rewarded placements:
- "Watch to revive once" on death (classic, high fill rate, doesn't feel predatory since it's
  opt-in and time-boxed).
- "Watch for +100 coins" capped at 2–3/day to avoid cannibalizing the coin IAP ladder.

This is the single highest-effort, non-trivial addition (SDK integration, App Tracking
Transparency prompt, mediation) — treat as its own workstream, not a line item here. Flag as
**parked** pending a decision on ad network (AdMob vs. IronSource vs. AppLovin) and whether ATT
opt-in rates justify it for a title this size.

### 3.3 Retention → revenue loop

IAP only converts if players return. Two levers already exist and are underused for monetization
framing:
- **Daily streak / login bonus** — check `meta` for an existing streak field; if absent, this is
  the cheapest addition here (a coin drip on day N) and directly feeds the coin-spend loop.
- **"What's new" popup** (`CHANGELOG[0]` shown on version bump) — currently just informs; add a
  one-tap link into the shop when the update includes new paid cosmetics, since this is the one
  guaranteed touchpoint with a returning player.

## 4. App Store Optimization (ASO) — currently undone

No screenshots, no keyword set, no localized listing exist yet for this build. This is free
revenue left on the table relative to engineering effort:

- **Screenshots**: capture via the existing headless driver
  (`.claude/skills/run-brawl-arena/driver.mjs --play --shoot`) at App Store required sizes —
  lead with a mid-combat frame (particles/zaps visible), not the start screen.
- **Keywords**: "zombie survival," "twin stick shooter," "horde survival," "battle royale zombie"
  — competitive-analysis pass needed against *Don't Die* and similar titles before finalizing.
- **Icon**: `Icon-60/76/83.5` assets were just deleted from the Xcode asset catalog per the
  current git status — confirm this is an intentional icon refresh in flight, not an accidental
  removal, before this PRD's ASO work builds on top of it.
- **Subtitle/promo text**: should sell the free-to-play hook ("no pay-to-win," "one life, one
  run") since that's a genuine differentiator worth stating explicitly in the listing copy.

## 5. Compliance guardrails (don't relitigate)

- All real-money purchases MUST go through StoreKit2 in the native wrapper — the Stripe donate
  link stays web-only (Guideline 3.1.1, already correctly separated in `StoreManager.swift`'s
  header comment).
- No paid odds-based loot — see §2 non-goals.
- Rewarded ads (if built) require an ATT prompt before any ad-network SDK initializes tracking.
- Restore Purchases must stay wired to `Transaction.currentEntitlements` (already correct) for
  every non-consumable/subscription SKU added — consumables are correctly excluded already.

## 6. Sequencing & effort

| Phase | Item | Effort | Blocked on |
|---|---|---|---|
| 0 | Set real prices for the 2 existing SKUs in App Store Connect | trivial | ASC access |
| 1 | Starter Pack SKU + first-death offer trigger | medium | Phase 0 |
| 1 | Coins 1200/3000 tiers | small | Phase 0 |
| 2 | Battle Pass season track (cosmetic) | large | new UI, season-state persistence in `meta` |
| 2 | ASO pass (screenshots, keywords, listing copy) | medium | icon asset decision (§4) |
| 3 | Rewarded video ads | large | ad network decision, ATT flow |
| 3 | Daily streak login bonus | small | confirm `meta` has no existing streak field |

## 7. Success metrics

- IAP conversion rate (purchasers / installs) — no current baseline, establish one post-Phase 0.
- ARPDAU — track once Phase 0 pricing is live.
- D1/D7 retention — proxy for whether monetization pressure (Starter Pack offer timing, streak
  bonus) is helping or hurting; a drop here after Phase 1 ships is the kill signal to revisit
  offer timing before Phase 2.
- Coin-pack $/coin elasticity — compare 500 vs. 1200 vs. 3000 attach rate once all three exist.

## 8. Open questions (need user/owner decision)

1. Real prices for Unlock Everything and coin tiers — no numbers exist in ASC today.
2. Ad network choice, and whether ads ship at all given the "no pay-to-win, respect the player"
   positioning implied by the existing non-predatory design (no loot boxes, no forced video).
3. Battle Pass season cadence (monthly? tied to `GAME_VERSION` bumps?) and whether it's
   consumable-per-season or an auto-renewing subscription (subscriptions add App Store review
   and receipt-validation complexity `StoreManager.swift` doesn't have yet).
