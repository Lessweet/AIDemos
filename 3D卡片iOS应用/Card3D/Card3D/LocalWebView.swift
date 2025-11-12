import SwiftUI
import WebKit

struct LocalWebView: View {
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            LocalHTMLView()
                .ignoresSafeArea()
        }
    }
}

struct LocalHTMLView: UIViewRepresentable {
    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let prefs = WKWebpagePreferences()
        prefs.allowsContentJavaScript = true
        config.defaultWebpagePreferences = prefs
        config.allowsInlineMediaPlayback = true

        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .black
        webView.scrollView.backgroundColor = .black
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false

        // 加载本地 HTML 文件
        if let htmlURL = Bundle.main.url(forResource: "sphere", withExtension: "html", subdirectory: "WebResources") {
            webView.loadFileURL(htmlURL, allowingReadAccessTo: htmlURL.deletingLastPathComponent())
            print("✅ 正在加载: \(htmlURL.path)")
        } else {
            print("❌ 找不到 sphere.html 文件")
            // 显示错误信息
            let errorHTML = """
            <!DOCTYPE html>
            <html>
            <head>
                <meta name="viewport" content="width=device-width">
                <style>
                    body {
                        background: #000;
                        color: #fff;
                        font-family: -apple-system;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                        padding: 20px;
                    }
                </style>
            </head>
            <body>
                <div>
                    <h2>⚠️ 资源加载失败</h2>
                    <p>找不到 sphere.html 文件</p>
                    <p style="font-size: 12px; color: #888; margin-top: 20px;">
                        请在 Xcode 中添加 WebResources 文件夹到项目
                    </p>
                </div>
            </body>
            </html>
            """
            webView.loadHTMLString(errorHTML, baseURL: nil)
        }

        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // 不需要更新
    }
}

#Preview {
    LocalWebView()
}
