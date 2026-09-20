import Cocoa
import WebKit

// A local companion window. It owns only its own position and floating level.
final class AppDelegate: NSObject, NSApplicationDelegate {
    var window: NSWindow!
    func applicationDidFinishLaunching(_ notification: Notification) {
        let screen = NSScreen.main?.visibleFrame ?? NSRect(x: 0, y: 0, width: 1440, height: 900)
        let width: CGFloat = 390
        let height = min(CGFloat(930), screen.height - 24)
        window = NSWindow(contentRect: NSRect(x: screen.maxX - width - 12, y: screen.maxY - height - 12, width: width, height: height), styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        window.title = "Jev · Live decisions"
        window.minSize = NSSize(width: 330, height: 620)
        window.level = .floating
        window.collectionBehavior = [.canJoinAllSpaces, .fullScreenAuxiliary]
        window.backgroundColor = NSColor(calibratedRed: 0.067, green: 0.09, blue: 0.067, alpha: 1)
        window.appearance = NSAppearance(named: .darkAqua)
        let web = WKWebView(frame: .zero)
        web.load(URLRequest(url: URL(string: "http://127.0.0.1:4317/sidecar")!))
        window.contentView = web
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        let menu = NSMenu()
        let appItem = NSMenuItem(); menu.addItem(appItem)
        let appMenu = NSMenu(); appItem.submenu = appMenu
        appMenu.addItem(withTitle: "Quit Jev Companion", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        NSApp.mainMenu = menu
    }
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }
}
let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
