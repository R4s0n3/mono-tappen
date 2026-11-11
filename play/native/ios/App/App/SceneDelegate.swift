import UIKit
import Capacitor

/// Navy behind the Capacitor web view, same as the launch storyboard (`#1d1f2f`).
let tappenNavy = UIColor(red: 29.0 / 255.0, green: 31.0 / 255.0, blue: 47.0 / 255.0, alpha: 1)

/// iOS 27 (SDK 27) traps at launch unless the app adopts the UIScene lifecycle.
/// This scene hosts the Main storyboard, whose root is Capacitor's bridge.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = self.window ?? UIWindow(windowScene: windowScene)
        window.backgroundColor = tappenNavy
        if window.rootViewController == nil {
            window.rootViewController = UIStoryboard(name: "Main", bundle: nil).instantiateInitialViewController()
        }
        window.rootViewController?.view.backgroundColor = tappenNavy
        self.window = window
        window.makeKeyAndVisible()
        (UIApplication.shared.delegate as? AppDelegate)?.window = window

        for context in connectionOptions.urlContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
        for activity in connectionOptions.userActivities {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        for context in URLContexts {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: context.url, options: [:])
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}
