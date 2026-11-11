import { createHash, createPublicKey, createVerify } from "node:crypto";

export const APPLE_ISSUER = "https://appleid.apple.com";
export const APPLE_AUDIENCE = "app.tappen.ios";

export type AppleJwk = {
  kty: string;
  kid: string;
  alg?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
};

export type AppleIdentity = {
  sub: string;
  email: string | null;
  emailVerified: boolean;
};

export class AppleTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppleTokenError";
  }
}

type VerifyInput = {
  keys: AppleJwk[];
  nonce: string;
  now?: Date;
  audience?: string;
  issuer?: string;
};

function decodeJson(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, "base64url").toString("utf8"));
  } catch {
    throw new AppleTokenError("malformed");
  }
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function audienceMatches(aud: unknown, expected: string): boolean {
  if (typeof aud === "string") return aud === expected;
  return Array.isArray(aud) && aud.some((value) => value === expected);
}

/**
 * Verify an Apple identity token against a JWKS set.
 * The nonce claim must be the raw nonce or the SHA-256 hex digest the
 * native request sent to Apple.
 */
export function verifyAppleIdentityToken(jwt: string, input: VerifyInput): AppleIdentity {
  const parts = jwt.split(".");
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
    throw new AppleTokenError("malformed");
  }
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
  const header = decodeJson(encodedHeader);
  if (!header || typeof header !== "object") throw new AppleTokenError("malformed");
  const alg = "alg" in header ? header.alg : undefined;
  const kid = "kid" in header ? header.kid : undefined;
  if (alg !== "RS256" || typeof kid !== "string") throw new AppleTokenError("algorithm");

  const jwk = input.keys.find((key) => key.kid === kid);
  if (!jwk) throw new AppleTokenError("key");

  const signature = Buffer.from(encodedSignature, "base64url");
  const verifier = createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();
  let valid = false;
  try {
    valid = verifier.verify(createPublicKey({ key: jwk, format: "jwk" }), signature);
  } catch {
    throw new AppleTokenError("key");
  }
  if (!valid) throw new AppleTokenError("signature");

  const payload = decodeJson(encodedPayload);
  if (!payload || typeof payload !== "object") throw new AppleTokenError("malformed");
  const claims = payload as Record<string, unknown>;
  if (claims.iss !== (input.issuer ?? APPLE_ISSUER)) throw new AppleTokenError("issuer");
  if (!audienceMatches(claims.aud, input.audience ?? APPLE_AUDIENCE)) throw new AppleTokenError("audience");
  const now = Math.floor((input.now ?? new Date()).getTime() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= now - 60) throw new AppleTokenError("expired");
  const expectedHash = sha256Hex(input.nonce);
  if (claims.nonce !== input.nonce && claims.nonce !== expectedHash) throw new AppleTokenError("nonce");
  if (typeof claims.sub !== "string" || claims.sub.length === 0) throw new AppleTokenError("subject");

  const email = typeof claims.email === "string" && claims.email.trim() !== "" ? claims.email : null;
  const verified = claims.email_verified === true || claims.email_verified === "true";
  return { sub: claims.sub, email, emailVerified: verified && email !== null };
}
