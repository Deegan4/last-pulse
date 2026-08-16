import Foundation
import SwiftData

@Model
final class GameSave {
    @Attribute(.unique) var id: String
    var code: String
    var updatedAt: Date

    init(code: String) {
        self.id = "meta"
        self.code = code
        self.updatedAt = .now
    }
}
