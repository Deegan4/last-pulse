import Foundation
import GameKit
import UIKit

/// Wraps Game Center authentication, "Best Wave" score submission, and the native leaderboard
/// UI for Endless Horde. Mirrors StoreManager.swift's shape: a singleton the view controller
/// drives, silent-fails on anything that isn't a real error the player needs to see (offline,
/// Game Center disabled in Settings, not yet authenticated — a horde run should never block on
/// this). GameViewController relays JS calls in via the "nativeSubmitScore"/"nativeShowLeaderboard"
/// message handlers (see bridges.js's nativeSubmitScore()/nativeShowLeaderboard()).
///
/// NOTE: `leaderboardID` below must exactly match a real leaderboard created in App Store
/// Connect → Features → Game Center before submission does anything — same caveat as
/// StoreManager's product IDs. Also requires the "Game Center" capability (entitlements +
/// Info.plist) enabled on the target; see LastPulse.entitlements / project.yml.
@MainActor
final class GameCenterManager: NSObject {
    static let shared = GameCenterManager()

    static let bestWaveLeaderboardID = "com.lastpulse.game.bestwave"

    private(set) var isAuthenticated = false
    /// The view controller GKAuthenticationViewController needs to present from, and the one
    /// GKGameCenterViewController presents on top of when the player taps the results-screen
    /// Leaderboard button.
    weak var presentingViewController: UIViewController?

    private override init() { super.init() }

    /// Call once from GameViewController.viewDidLoad. GameKit itself decides whether to show
    /// its own sign-in sheet (first launch / signed out) — we just need to supply a VC to hang
    /// it off of and swallow whatever comes back.
    func authenticate() {
        GKLocalPlayer.local.authenticateHandler = { [weak self] viewController, error in
            guard let self else { return }
            if let viewController {
                self.presentingViewController?.present(viewController, animated: true)
                return
            }
            self.isAuthenticated = (error == nil) && GKLocalPlayer.local.isAuthenticated
        }
    }

    /// Submits this run's horde wave. Game Center leaderboards keep only the player's best
    /// automatically (ranked descending), so every match end posts unconditionally rather than
    /// tracking a local high-water mark first.
    func submitScore(_ wave: Int) {
        guard isAuthenticated, wave > 0 else { return }
        Task {
            try? await GKLeaderboard.submitScore(
                wave, context: 0, player: GKLocalPlayer.local,
                leaderboardIDs: [Self.bestWaveLeaderboardID]
            )
        }
    }

    func showLeaderboard() {
        guard isAuthenticated, let presenter = presentingViewController else { return }
        let vc = GKGameCenterViewController(leaderboardID: Self.bestWaveLeaderboardID, playerScope: .global, timeScope: .allTime)
        vc.gameCenterDelegate = self
        presenter.present(vc, animated: true)
    }
}

extension GameCenterManager: GKGameCenterControllerDelegate {
    func gameCenterViewControllerDidFinish(_ gameCenterViewController: GKGameCenterViewController) {
        gameCenterViewController.dismiss(animated: true)
    }
}
