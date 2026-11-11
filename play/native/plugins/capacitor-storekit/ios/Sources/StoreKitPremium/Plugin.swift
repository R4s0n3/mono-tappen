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
    ]

    private static let productId = "app.tappen.ios.premium"

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
                guard let product = try await Self.premiumProduct() else {
                    self.reject(call, "Premium is not available from the App Store.")
                    return
                }
                switch try await product.purchase() {
                case .success(let verification):
                    guard let signed = try await Self.signedPremiumTransaction(verification, required: true) else {
                        self.reject(call, "Could not complete the purchase.")
                        return
                    }
                    self.resolve(call, [
                        "cancelled": false,
                        "signedTransaction": signed,
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

    @objc func currentEntitlements(_ call: CAPPluginCall) {
        Task {
            do {
                var signedTransactions: [String] = []
                for await result in Transaction.currentEntitlements {
                    if let signed = try await Self.signedPremiumTransaction(result, required: false) {
                        signedTransactions.append(signed)
                    }
                }
                self.resolve(call, ["signedTransactions": signedTransactions])
            } catch {
                self.reject(call, error.localizedDescription)
            }
        }
    }

    private static func premiumProduct() async throws -> Product? {
        let products = try await Product.products(for: [productId])
        return products.first { $0.id == productId }
    }

    private static func signedPremiumTransaction(
        _ result: VerificationResult<Transaction>,
        required: Bool
    ) async throws -> String? {
        guard case .verified(let transaction) = result, transaction.productID == productId else {
            if !required { return nil }
            throw NSError(
                domain: "StoreKitPremium",
                code: 1,
                userInfo: [NSLocalizedDescriptionKey: "The App Store could not verify this purchase."]
            )
        }
        let signed = result.jwsRepresentation
        await transaction.finish()
        return signed
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
