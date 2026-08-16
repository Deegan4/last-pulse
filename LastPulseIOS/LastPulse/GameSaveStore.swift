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
        do {
            container = try ModelContainer(for: GameSave.self)
        } catch {
            fatalError("Failed to create SwiftData container for GameSave: \(error)")
        }
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
