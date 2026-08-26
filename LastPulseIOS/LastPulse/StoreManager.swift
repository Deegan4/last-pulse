import Foundation
import StoreKit

/// Wraps the single non-consumable IAP ("Unlock Everything" — bypasses the level-gated
/// avatar/weapon unlocks in index.html) via StoreKit2. Real money purchases can't go through
/// the web game's Stripe donate link inside a native app (App Store Review Guideline 3.1.1
/// forbids an external payment link for digital content), so this is the compliant path;
/// GameViewController relays its results into the page via window.__nativeSetEntitlement /
/// window.__nativeSetProductPrice.
///
/// NOTE: `unlockAllProductID` must exactly match a non-consumable IAP product created in
/// App Store Connect before this can load a real price or complete a real purchase — in
/// sandbox/dev without that product configured, `loadProducts()` simply finds nothing and the
/// button never appears (see `iapGo.hidden` gating in index.html's openDonate()).
@MainActor
final class StoreManager {
    static let shared = StoreManager()

    static let unlockAllProductID = "com.lastpulse.game.unlockall"

    private(set) var products: [Product] = []
    private(set) var ownsUnlockAll = false
    private var updatesTask: Task<Void, Never>?

    private init() {
        updatesTask = Task { [weak self] in
            for await update in Transaction.updates {
                await self?.handle(update)
            }
        }
    }

    deinit { updatesTask?.cancel() }

    func loadProducts() async {
        products = (try? await Product.products(for: [Self.unlockAllProductID])) ?? []
    }

    func localizedPrice(for productID: String) -> String? {
        products.first(where: { $0.id == productID })?.displayPrice
    }

    /// Checks StoreKit's own record of current entitlements (source of truth) rather than
    /// trusting any locally-cached flag, so a reinstall or new device restores correctly.
    func refreshEntitlements() async {
        for await result in Transaction.currentEntitlements {
            await handle(result)
        }
    }

    func purchase(_ productID: String) async -> Bool {
        guard let product = products.first(where: { $0.id == productID }) else { return false }
        guard let result = try? await product.purchase() else { return false }
        switch result {
        case .success(let verification):
            await handle(verification)
            return true
        case .userCancelled, .pending:
            return false
        @unknown default:
            return false
        }
    }

    func restore() async {
        try? await AppStore.sync()
        await refreshEntitlements()
    }

    private func handle(_ result: VerificationResult<Transaction>) async {
        guard case .verified(let transaction) = result else { return }
        if transaction.productID == Self.unlockAllProductID && transaction.revocationDate == nil {
            ownsUnlockAll = true
        }
        await transaction.finish()
    }
}
