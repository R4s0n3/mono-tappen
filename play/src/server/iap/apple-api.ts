import { createSign, type X509Certificate } from "node:crypto";

import {
  assertPremiumTransaction,
  appleIapCredentialsFromEnv,
  appleRootCertificates,
  verifyAppleSignedTransaction,
  type AppleIapCredentials,
  type ApplePremiumTransaction,
  PremiumPurchaseError,
} from "./premium";

const PRODUCTION_API = "https://api.storekit.itunes.apple.com";
const SANDBOX_API = "https://api.storekit-sandbox.itunes.apple.com";
const API_TIMEOUT_MS = 10_000;

function base64url(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

/** JWT for the App Store Server API. Signed with the In-App Purchase key. */
export function appStoreServerJwt(credentials: AppleIapCredentials, now: Date): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }));
  const issued = Math.floor(now.getTime() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: credentials.issuerId,
      iat: issued,
      exp: issued + 5 * 60,
      aud: "appstoreconnect-v1",
      bid: credentials.bundleId,
    }),
  );
  const data = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign({ key: credentials.privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${base64url(signature)}`;
}

async function signedTransactionFromApi(
  transactionId: string,
  environment: ApplePremiumTransaction["environment"],
  token: string,
  fetchImpl: typeof fetch,
): Promise<{ status: number; signedTransactionInfo: string | null }> {
  const host = environment === "Sandbox" ? SANDBOX_API : PRODUCTION_API;
  const response = await fetchImpl(`${host}/inApps/v1/transactions/${encodeURIComponent(transactionId)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(API_TIMEOUT_MS),
  });
  if (response.status === 404) return { status: 404, signedTransactionInfo: null };
  if (!response.ok) return { status: response.status, signedTransactionInfo: null };
  const body = (await response.json()) as { signedTransactionInfo?: unknown };
  return {
    status: response.status,
    signedTransactionInfo: typeof body.signedTransactionInfo === "string" ? body.signedTransactionInfo : null,
  };
}

/**
 * Verify the device's signed transaction, then confirm that same transaction
 * with the App Store Server API. The API response is what we trust.
 */
export async function verifiedPremiumTransaction(
  signedTransaction: string,
  deps: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    now?: Date;
    roots?: X509Certificate[];
    log?: (message: string) => void;
  } = {},
): Promise<ApplePremiumTransaction> {
  const log = deps.log ?? ((message) => console.warn(message));
  const credentials = appleIapCredentialsFromEnv(deps.env ?? process.env);
  if (!credentials) throw new PremiumPurchaseError("config");
  const now = deps.now ?? new Date();
  const roots = deps.roots ?? appleRootCertificates();
  const clientTransaction = verifyAppleSignedTransaction(signedTransaction, roots, now);
  assertPremiumTransaction(clientTransaction);
  const fetchImpl = deps.fetchImpl ?? fetch;
  const token = appStoreServerJwt(credentials, now);
  const order: ApplePremiumTransaction["environment"][] =
    clientTransaction.environment === "Sandbox" ? ["Sandbox", "Production"] : ["Production", "Sandbox"];
  let lastStatus = 0;
  for (const environment of order) {
    let result: { status: number; signedTransactionInfo: string | null };
    try {
      result = await signedTransactionFromApi(clientTransaction.transactionId, environment, token, fetchImpl);
    } catch (error) {
      log(`App Store Server API request failed: ${error instanceof Error ? error.message : "network"}`);
      throw new PremiumPurchaseError("apple");
    }
    if (result.status === 404) {
      lastStatus = 404;
      continue;
    }
    if (!result.signedTransactionInfo) {
      log(`App Store Server API request failed: ${result.status}`);
      throw new PremiumPurchaseError("apple");
    }
    const apiTransaction = verifyAppleSignedTransaction(result.signedTransactionInfo, roots, now);
    if (apiTransaction.environment !== environment) throw new PremiumPurchaseError("environment");
    if (
      apiTransaction.transactionId !== clientTransaction.transactionId ||
      apiTransaction.originalTransactionId !== clientTransaction.originalTransactionId
    ) {
      throw new PremiumPurchaseError("transaction");
    }
    assertPremiumTransaction(apiTransaction);
    return apiTransaction;
  }
  log(`App Store Server API has no transaction ${clientTransaction.transactionId}: ${lastStatus || "missing"}`);
  throw new PremiumPurchaseError("not-found");
}
