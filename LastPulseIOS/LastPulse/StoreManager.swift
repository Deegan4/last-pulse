import Foundation
import StoreKit

/// Wraps two IAPs via StoreKit2:
///  - "Unlock Everything" (non-consumable) — bypasses the level-gated avatar/weapon unlocks
///    in index.html. Real money purchases can't go through the web game's Stripe donate link
///    inside a native app (App Store Review Guideline 3.1.1 forbids an external payment link
///    for digital content), so this is the compliant path.
///  - "500 Coins" (consumable) — tops up `meta.coins`, the same shop currency earned in-match.
/// GameViewController relays results into the page via window.__nativeSetEntitlement (unlock-all)
/// / window.__nativeCoinsGranted (coin pack) / window.__nativeSetProductPrice (both).
///
/// NOTE: both product IDs below must exactly match real products created in App Store Connect
/// before this can load a price or complete a real purchase — in sandbox/dev without them
/// configured, `loadProducts()` simply finds nothing and the buttons never appear (see the
/// `iapGo.hidden` / `inNativeWrapper()` gating in index.html).
@MainActor
final class StoreManager {
    static let shared = StoreManager()

    static let unlockAllProductID = "com.lastpulse.game.unlockall"
    static let coins500ProductID = "com.lastpulse.game.coins500"

    /// Consumable product IDs mapped to the coin amount they grant. Consumables never appear
    /// in `Transaction.currentEntitlements` and aren't restorable across devices/reinstalls —
    /// that's expected App Store behavior for consumables, not a bug.
    private static let coinAmounts: [String: Int] = [coins500ProductID: 500]

    enum PurchaseResult {
        case unlockAll
        case coins(Int)
        case failed
    }

    private(set) var products: [Product] = []
    private(set) var ownsUnlockAll = false
    private var updatesTask: Task<Void, Never>?

    private init() {
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handleEntitlementUpdate(update)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    func loadProducts() async {
        products = (try? await Product.products(for: [Self.unlockAllProductID, Self.coins500ProductID])) ?? []
    }

    func localizedPrice(for productID: String) -> String? {
        products.first(where: { $0.id == productID })?.displayPrice
    }

    /// Checks StoreKit's own record of current entitlements (source of truth) rather than
    /// trusting any locally-cached flag, so a reinstall or new device restores correctly.
    /// Only covers the non-consumable — consumables have nothing to restore.
    func refreshEntitlements() async {
        for await result in Transaction.currentEntitlements {
            await handleEntitlementUpdate(result)
        }
    }

    /// Drives a purchase to completion and reports what was actually bought, so the caller
    /// (GameViewController) knows whether to flip the unlock-all flag or credit coins — doing
    /// that decision here, once, keeps a consumable from ever being double-credited by also
    /// routing through the `Transaction.updates` listener.
    func purchase(_ productID: String) async -> PurchaseResult {
        guard let product = products.first(where: { $0.id == productID }) else { return .failed }
        guard let result = try? await product.purchase() else { return .failed }
        switch result {
        case .success(let verification):
            guard case .verified(let transaction) = verification else { return .failed }
            await transaction.finish()
            if transaction.productID == Self.unlockAllProductID {
                ownsUnlockAll = true
                return .unlockAll
            }
            if let amount = Self.coinAmounts[transaction.productID] {
                return .coins(amount)
            }
            return .failed
        case .userCancelled, .pending:
            return .failed
        @unknown default:
            return .failed
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await refreshEntitlements()
    }

    private func handleEntitlementUpdate(_ result: VerificationResult<Transaction>) async {
        guard case .verified(let transaction) = result else { return }
        if transaction.productID == Self.unlockAllProductID && transaction.revocationDate == nil {
            ownsUnlockAll = true
        }
        await transaction.finish()
    }
}
