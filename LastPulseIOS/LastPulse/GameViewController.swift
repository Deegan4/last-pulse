import UIKit
import WebKit

/// Forwards WKScriptMessageHandler callbacks without WKUserContentController holding a
/// strong reference to the view controller (it retains handlers for the container's
/// lifetime, which would otherwise be a permanent retain cycle).
private final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {
    weak var delegate: WKScriptMessageHandler?
    init(delegate: WKScriptMessageHandler) { self.delegate = delegate }
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        delegate?.userContentController(userContentController, didReceive: message)
    }
}

final class GameViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler {
    private static let nativeSaveHandlerName = "nativeSave"

    private let webView: WKWebView

    init() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.websiteDataStore = .nonPersistent()
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init(nibName: nil, bundle: nil)
        configuration.userContentController.add(
            WeakScriptMessageHandler(delegate: self),
            name: Self.nativeSaveHandlerName
        )
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    deinit {
        webView.configuration.userContentController.removeScriptMessageHandler(forName: Self.nativeSaveHandlerName)
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.067, green: 0.114, blue: 0.047, alpha: 1)
        webView.navigationDelegate = self
        webView.isOpaque = false
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(webView)
        webView.frame = view.bounds

        if let code = GameSaveStore.shared.loadCode(),
           let payload = try? JSONSerialization.data(withJSONObject: [code]),
           let payloadJSON = String(data: payload, encoding: .utf8) {
            // Runs before index.html's own script (document-start = earliest injection point,
            // ahead of every page script), so `meta` picks up the restored save the moment
            // it's constructed instead of after the start screen has already rendered defaults.
            let bootScript = WKUserScript(
                source: "window.__nativeBootCode = \(payloadJSON)[0];",
                injectionTime: .atDocumentStart,
                forMainFrameOnly: true
            )
            webView.configuration.userContentController.addUserScript(bootScript)
        }

        guard let gameURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "GameContent") else {
            assertionFailure("GameContent/index.html is missing from the app bundle")
            return
        }
        let readAccessURL = gameURL.deletingLastPathComponent()
        WKWebsiteDataStore.default().removeData(
            ofTypes: WKWebsiteDataStore.allWebsiteDataTypes(),
            modifiedSince: .distantPast
        ) { [weak self] in
            self?.webView.loadFileURL(gameURL, allowingReadAccessTo: readAccessURL)
        }
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var shouldAutorotate: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }

    // MARK: - Native save bridge (SwiftData)
    //
    // The WKWebView above uses a non-persistent data store and wipes it on every launch, so
    // localStorage can't carry player progress between sessions. index.html mirrors every
    // `saveMeta()` out to the "nativeSave" message handler below as an `LP1.`-prefixed save
    // code (the same format its own save-code export/import feature already uses); we persist
    // that string in SwiftData (GameSaveStore) and inject it back as `window.__nativeBootCode`
    // (see viewDidLoad) before the page's own script runs, so the restored save is in place
    // the moment `meta` is first constructed — not after the start screen has already
    // rendered its (empty) defaults.

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == Self.nativeSaveHandlerName, let code = message.body as? String else { return }
        Task { @MainActor in
            GameSaveStore.shared.saveCode(code)
        }
    }
}
