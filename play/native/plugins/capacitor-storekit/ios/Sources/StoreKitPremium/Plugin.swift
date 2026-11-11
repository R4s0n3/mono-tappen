import Foundation
import Capacitor
import StoreKit

@objc(StoreKitPremium)
public class StoreKitPremium: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "StoreKitPremium"
    public let jsName = "StoreKitPremium"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getProduct", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "currentEntitlements", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "finish", returnType: CAPPluginReturnPromise),
    ]

    private static let productId = "app.tappen.ios.premium"
    private var updatesTask: Task<Void, Never>?

    @objc override public func load() {
        updatesTask = Task { [weak self] in
            for await result in Transaction.updates {
                guard let plugin = self else { return }
                guard let signed = try? Self.signedPremiumTransaction(result, required: false) else { continue }
                var payload: [String: Any] = ["signedTransaction": signed.jws]
                if let appAccountToken = signed.appAccountToken {
                    payload["appAccountToken"] = appAccountToken
                }
                plugin.notifyListeners("transaction", data: payload)
            }
        }
    }

    deinit {
        updatesTask?.cancel()
    }

    @objc func getProduct(_ call: CAPPluginCall) {
        Task {
            do {
                guard let product = try await Self.premiumProduct() else {
                    self.reject(call, "Premium is not available from the App Store.")
                    return
                }
                self.resolve(call, [
                    "id": product.id,
                    "displayPrice": product.displayPrice,
                    "displayName": product.displayName,
                ])
            } catch {
                self.reject(call, error.localizedDescription)
            }
        }
    }

    @objc func purchase(_ call: CAPPluginCall) {
        Task {
            do {
                guard let token = call.getString("appAccountToken"), let accountToken = UUID(uuidString: token) else {
                    self.reject(call, "Could not complete the purchase.")
                    return
                }
                guard let product = try await Self.premiumProduct() else {
                    self.reject(call, "Premium is not available from the App Store.")
                    return
                }
                switch try await product.purchase(options: [.appAccountToken(accountToken)]) {
                case .success(let verification):
                    guard let signed = try Self.signedPremiumTransaction(verification, required: true) else {
                        self.reject(call, "Could not complete the purchase.")
                        return
                    }
                    self.resolve(call, [
                        "cancelled": false,
                        "signedTransaction": signed.jws,
                    ])
                case .userCancelled:
                    self.resolve(call, ["cancelled": true])
                case .pending:
                    self.reject(call, "This purchase is waiting for approval.")
                @unknown default:
                    self.reject(call, "Could not complete the purchase.")
                }
            } catch {
                self.reject(call, error.localizedDescription)
            }
        }
    }

    /// Restore is the only path that syncs with the App Store. Pass sync: true there.
    @objc func currentEntitlements(_ call: CAPPluginCall) {
        let sync = call.getBool("sync") ?? false
        Task {
            do {
                if sync {
                    try await AppStore.sync()
                }
                var signedTransactions: [String] = []
                for await result in Transaction.currentEntitlements {
                    if let signed = try Self.signedPremiumTransaction(result, required: false) {
                        signedTransactions.append(signed.jws)
                    }
                }
                self.resolve(call, ["signedTransactions": signedTransactions])
            } catch {
                self.reject(call, error.localizedDescription)
            }
        }
    }

    /// Finish only after play has granted, restored, or recorded the refund.
    @objc func finish(_ call: CAPPluginCall) {
        guard let transactionId = call.getString("transactionId"), !transactionId.isEmpty else {
            self.reject(call, "Could not complete the purchase.")
            return
        }
        Task {
            do {
                for await result in Transaction.unfinished {
                    guard case .verified(let transaction) = result else { continue }
                    if String(transaction.id) == transactionId && transaction.productID == Self.productId {
                        await transaction.finish()
                    }
                }
                self.resolve(call, [:])
            } catch {
                self.reject(call, error.localizedDescription)
            }
        }
    }

    private static func premiumProduct() async throws -> Product? {
        let products = try await Product.products(for: [productId])
        return products.first { $0.id == productId }
    }

    private struct SignedPremium {
        let jws: String
        let appAccountToken: String?
    }

    private static func signedPremiumTransaction(
        _ result: VerificationResult<Transaction>,
        required: Bool
    ) throws -> SignedPremium? {
        guard case .verified(let transaction) = result, transaction.productID == productId else {
            if !required { return nil }
            throw NSError(
                domain: "StoreKitPremium",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "The App Store could not verify this purchase."]
            )
        }
        return SignedPremium(
            jws: result.jwsRepresentation,
            appAccountToken: transaction.appAccountToken?.uuidString.lowercased()
        )
    }

    private func resolve(_ call: CAPPluginCall, _ data: PluginCallResultData) {
        DispatchQueue.main.async {
            call.resolve(data)
        }
    }

    private func reject(_ call: CAPPluginCall, _ message: String) {
        DispatchQueue.main.async {
            call.reject(message)
        }
    }
}
