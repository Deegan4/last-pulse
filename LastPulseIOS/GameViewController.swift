import UIKit
import WebKit

final class GameViewController: UIViewController, WKNavigationDelegate {
    private let webView: WKWebView

    init() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

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

        guard let gameURL = Bundle.main.url(forResource: "index", withExtension: "html", subdirectory: "GameContent") else {
            assertionFailure("GameContent/index.html is missing from the app bundle")
            return
        }
        webView.loadFileURL(gameURL, allowingReadAccessTo: gameURL.deletingLastPathComponent())
    }

    override var prefersStatusBarHidden: Bool { true }
    override var prefersHomeIndicatorAutoHidden: Bool { true }
    override var shouldAutorotate: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .all }
}
