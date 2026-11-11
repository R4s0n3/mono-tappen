import { createSign } from "node:crypto";

import { APPLE_AUDIENCE, APPLE_ISSUER } from "./apple-token";

export const APPLE_ENV_KEYS = ["APPLE_TEAM_ID", "APPLE_KEY_ID", "APPLE_PRIVATE_KEY"] as const;

const REVOKE_SKIPPED =
  "Apple token revoke skipped: APPLE_TEAM_ID, APPLE_KEY_ID, or APPLE_PRIVATE_KEY is not set";
const REVOKE_NO_TOKEN =
  "Apple token revoke skipped: this account has no stored Apple refresh token";

export type AppleClientCredentials = {
  teamId: string;
  keyId: string;
  privateKey: string;
  clientId: string;
};

export function appleCredentialsFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): AppleClientCredentials | null {
  const teamId = env.APPLE_TEAM_ID?.trim();
  const keyId = env.APPLE_KEY_ID?.trim();
  const privateKey = env.APPLE_PRIVATE_KEY?.trim();
  if (!teamId || !keyId || !privateKey) return null;
  const clientId = env.APPLE_CLIENT_ID?.trim();
  return {
    teamId,
    keyId,
    privateKey: privateKey.includes("\\n") ? privateKey.replaceAll("\\n", "\n") : privateKey,
    clientId: clientId ? clientId : APPLE_AUDIENCE,
  };
}

function base64url(value: Buffer | string): string {
  const buffer = typeof value === "string" ? Buffer.from(value) : value;
  return buffer.toString("base64url");
}

/** ES256 client secret for Apple's token and revoke endpoints. */
export function appleClientSecret(credentials: AppleClientCredentials, now: Date): string {
  const header = base64url(JSON.stringify({ alg: "ES256", kid: credentials.keyId, typ: "JWT" }));
  const issued = Math.floor(now.getTime() / 1000);
  const payload = base64url(
    JSON.stringify({
      iss: credentials.teamId,
      iat: issued,
      exp: issued + 5 * 60,
      aud: APPLE_ISSUER,
      sub: credentials.clientId,
    }),
  );
  const data = `${header}.${payload}`;
  const signer = createSign("SHA256");
  signer.update(data);
  signer.end();
  const signature = signer.sign({ key: credentials.privateKey, dsaEncoding: "ieee-p1363" });
  return `${data}.${base64url(signature)}`;
}

export async function exchangeAppleAuthorizationCode(
  authorizationCode: string,
  deps: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    now?: Date;
    log?: (message: string) => void;
  } = {},
): Promise<string | null> {
  const log = deps.log ?? ((message) => console.warn(message));
  const credentials = appleCredentialsFromEnv(deps.env ?? process.env);
  if (!credentials) {
    log(REVOKE_SKIPPED);
    return null;
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: authorizationCode,
    client_id: credentials.clientId,
    client_secret: appleClientSecret(credentials, deps.now ?? new Date()),
  });
  const response = await fetchImpl("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    log(`Apple authorization code exchange failed: ${response.status}`);
    return null;
  }
  const json = (await response.json()) as { refresh_token?: unknown };
  return typeof json.refresh_token === "string" && json.refresh_token !== "" ? json.refresh_token : null;
}

export async function revokeAppleRefreshToken(
  refreshToken: string | null,
  deps: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: typeof fetch;
    now?: Date;
    log?: (message: string) => void;
  } = {},
): Promise<"revoked" | "skipped" | "failed"> {
  const log = deps.log ?? ((message) => console.warn(message));
  const credentials = appleCredentialsFromEnv(deps.env ?? process.env);
  if (!credentials) {
    log(REVOKE_SKIPPED);
    return "skipped";
  }
  if (!refreshToken) {
    log(REVOKE_NO_TOKEN);
    return "skipped";
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: credentials.clientId,
    client_secret: appleClientSecret(credentials, deps.now ?? new Date()),
    token: refreshToken,
    token_type_hint: "refresh_token",
  });
  try {
    const response = await fetchImpl("https://appleid.apple.com/auth/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!response.ok) {
      log(`Apple token revoke failed: ${response.status}`);
      return "failed";
    }
    return "revoked";
  } catch (error) {
    log(`Apple token revoke failed: ${error instanceof Error ? error.message : "network"}`);
    return "failed";
  }
}
