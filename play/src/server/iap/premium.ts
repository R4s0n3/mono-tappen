import { X509Certificate, createVerify } from "node:crypto";

/** The only in-app product. A non-consumable, not a subscription. */
export const PREMIUM_PRODUCT_ID = "app.tappen.ios.premium";
export const PREMIUM_BUNDLE_ID = "app.tappen.ios";

export const APPLE_IAP_ENV_KEYS = ["APPLE_IAP_ISSUER_ID", "APPLE_IAP_KEY_ID", "APPLE_IAP_PRIVATE_KEY"] as const;

/**
 * Apple Root CA - G3. Public certificate from apple.com/certificateauthority.
 * StoreKit 2 transaction signatures chain to this root.
 */
export const APPLE_ROOT_CA_G3_PEM = `-----BEGIN CERTIFICATE-----
MIICQzCCAcmgAwIBAgIILcX8iNLFS5UwCgYIKoZIzj0EAwMwZzEbMBkGA1UEAwwS
QXBwbGUgUm9vdCBDQSAtIEczMSYwJAYDVQQLDB1BcHBsZSBDZXJ0aWZpY2F0aW9u
IEF1dGhvcml0eTETMBEGA1UECgwKQXBwbGUgSW5jLjELMAkGA1UEBhMCVVMwHhcN
MTQwNDMwMTgxOTA2WhcNMzkwNDMwMTgxOTA2WjBnMRswGQYDVQQDDBJBcHBsZSBS
b290IENBIC0gRzMxJjAkBgNVBAsMHUFwcGxlIENlcnRpZmljYXRpb24gQXV0aG9y
aXR5MRMwEQYDVQQKDApBcHBsZSBJbmMuMQswCQYDVQQGEwJVUzB2MBAGByqGSM49
AgEGBSuBBAAiA2IABJjpLz1AcqTtkyJygRMc3RCV8cWjTnHcFBbZDuWmBSp3ZHtf
TjjTuxxEtX/1H7YyYl3J6YRbTzBPEVoA/VhYDKX1DyxNB0cTddqXl5dvMVztK517
IDvYuVTZXpmkOlEKMaNCMEAwHQYDVR0OBBYEFLuw3qFYM4iapIqZ3r6966/ayySr
MA8GA1UdEwEB/wQFMAMBAf8wDgYDVR0PAQH/BAQDAgEGMAoGCCqGSM49BAMDA2gA
MGUCMQCD6cHEFl4aXTQY2e3v9GwOAEZLuN+yRhHFD/3meoyhpmvOwgPUnPWTxnS4
at+qIxUCMG1mihDK1A3UT82NQz60imOlM27jbdoXt2QfyFMm+YhidDkLF1vLUagM
6BgD56KyKA==
-----END CERTIFICATE-----`;

export function appleRootCertificates(): X509Certificate[] {
  return [new X509Certificate(APPLE_ROOT_CA_G3_PEM)];
}

export class PremiumPurchaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PremiumPurchaseError";
  }
}

export type ApplePremiumTransaction = {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  bundleId: string;
  type: string;
  environment: "Sandbox" | "Production";
  revocationDate: number | null;
};

export type AppleIapCredentials = {
  issuerId: string;
  keyId: string;
  privateKey: string;
  bundleId: string;
};

export function appleIapCredentialsFromEnv(env: NodeJS.ProcessEnv = process.env): AppleIapCredentials | null {
  const issuerId = env.APPLE_IAP_ISSUER_ID?.trim();
  const keyId = env.APPLE_IAP_KEY_ID?.trim();
  const privateKey = env.APPLE_IAP_PRIVATE_KEY?.trim();
  if (!issuerId || !keyId || !privateKey) return null;
  return {
    issuerId,
    keyId,
    privateKey: privateKey.includes("\\n") ? privateKey.replaceAll("\\n", "\n") : privateKey,
    bundleId: PREMIUM_BUNDLE_ID,
  };
}

function derToCertificate(derBase64: string): X509Certificate {
  const body = derBase64.replace(/\s/g, "");
  const lines = body.match(/.{1,64}/g) ?? [];
  return new X509Certificate(
    `-----BEGIN CERTIFICATE-----\n${lines.join("\n")}\n-----END CERTIFICATE-----\n`,
  );
}

function certificateCurrent(certificate: X509Certificate, now: Date): boolean {
  const time = now.getTime();
  return time >= new Date(certificate.validFrom).getTime() && time <= new Date(certificate.validTo).getTime();
}

function trustedLeaf(x5c: string[], roots: X509Certificate[], now: Date): X509Certificate {
  const certificates = x5c.map(derToCertificate);
  const leaf = certificates[0];
  const last = certificates[certificates.length - 1];
  if (!leaf || !last) throw new PremiumPurchaseError("chain");
  for (const certificate of certificates) {
    if (!certificateCurrent(certificate, now)) throw new PremiumPurchaseError("chain");
  }
  for (let index = 0; index < certificates.length - 1; index += 1) {
    const current = certificates[index];
    const issuer = certificates[index + 1];
    if (!current || !issuer || !current.verify(issuer.publicKey)) throw new PremiumPurchaseError("chain");
  }
  const pinned = roots.some(
    (root) => root.fingerprint256 === last.fingerprint256 || last.verify(root.publicKey),
  );
  if (!pinned) throw new PremiumPurchaseError("root");
  return leaf;
}

function readTransaction(payload: Record<string, unknown>): ApplePremiumTransaction {
  const environment = payload.environment;
  if (environment !== "Sandbox" && environment !== "Production") {
    throw new PremiumPurchaseError("environment");
  }
  const revocation = payload.revocationDate;
  if (revocation != null && typeof revocation !== "number") throw new PremiumPurchaseError("revoked");
  const text = (key: string): string => {
    const value = payload[key];
    return typeof value === "string" ? value : "";
  };
  const transaction: ApplePremiumTransaction = {
    transactionId: text("transactionId"),
    originalTransactionId: text("originalTransactionId"),
    productId: text("productId"),
    bundleId: text("bundleId"),
    type: text("type"),
    environment,
    revocationDate: typeof revocation === "number" ? revocation : null,
  };
  if (transaction.transactionId === "" || transaction.originalTransactionId === "") {
    throw new PremiumPurchaseError("transaction");
  }
  return transaction;
}

/** Verify a StoreKit 2 signed transaction against the pinned Apple root. */
export function verifyAppleSignedTransaction(
  jws: string,
  roots: X509Certificate[],
  now = new Date(),
): ApplePremiumTransaction {
  const parts = jws.split(".");
  if (parts.length !== 3 || parts.some((part) => part === "")) throw new PremiumPurchaseError("malformed");
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  let header: { alg?: unknown; x5c?: unknown };
  try {
    header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8")) as { alg?: unknown; x5c?: unknown };
  } catch {
    throw new PremiumPurchaseError("malformed");
  }
  if (header.alg !== "ES256" || !Array.isArray(header.x5c)) throw new PremiumPurchaseError("chain");
  const x5c = header.x5c.filter((item): item is string => typeof item === "string" && item !== "");
  if (x5c.length < 2 || x5c.length !== header.x5c.length) throw new PremiumPurchaseError("chain");
  const leaf = trustedLeaf(x5c, roots, now);
  const verifier = createVerify("SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  const valid = verifier.verify(
    { key: leaf.publicKey, dsaEncoding: "ieee-p1363" },
    Buffer.from(encodedSignature, "base64url"),
  );
  if (!valid) throw new PremiumPurchaseError("signature");
  try {
    return readTransaction(JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as Record<string, unknown>);
  } catch (error) {
    if (error instanceof PremiumPurchaseError) throw error;
    throw new PremiumPurchaseError("malformed");
  }
}

export function assertPremiumTransaction(transaction: ApplePremiumTransaction): void {
  if (transaction.bundleId !== PREMIUM_BUNDLE_ID) throw new PremiumPurchaseError("bundle");
  if (transaction.productId !== PREMIUM_PRODUCT_ID) throw new PremiumPurchaseError("product");
  if (transaction.type !== "Non-Consumable") throw new PremiumPurchaseError("type");
  if (transaction.revocationDate != null) throw new PremiumPurchaseError("revoked");
}
