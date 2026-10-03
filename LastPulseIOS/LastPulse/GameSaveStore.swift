import Foundation
import SwiftData

/// Persists the web game's save (an `LP1.`-prefixed base64 blob produced by
/// `exportSave()`/`importSave()` in index.html) natively via SwiftData, since the
/// WKWebView in GameViewController runs with a non-persistent data store and wipes
/// localStorage on every launch.
@MainActor
final class GameSaveStore {
    static let shared = GameSaveStore()

    private let container: ModelContainer

    private init() {
        // A corrupted on-disk store or disk pressure shouldn't crash launch — fall back to an
        // in-memory container so the game still runs; progress just won't persist this session
        // (matches the JS side's own safeGet/safeSet fail-safe philosophy). In-memory container
        // creation has no disk I/O to fail on, so this is the actual last resort.
        let inMemory = ModelConfiguration(isStoredInMemoryOnly: true)
        container = (try? ModelContainer(for: GameSave.self))
            ?? (try! ModelContainer(for: GameSave.self, configurations: inMemory))
    }

    func loadCode() -> String? {
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<GameSave>(predicate: #Predicate { $0.id == "meta" })
        let results = (try? context.fetch(descriptor)) ?? []
        return results.first?.code
    }

    func saveCode(_ code: String) {
        guard !code.isEmpty else { return }
        let context = ModelContext(container)
        let descriptor = FetchDescriptor<GameSave>(predicate: #Predicate { $0.id == "meta" })
        let results = (try? context.fetch(descriptor)) ?? []
        if let existing = results.first {
            existing.code = code
            existing.updatedAt = .now
        } else {
            context.insert(GameSave(code: code))
        }
        try? context.save()
    }
}
