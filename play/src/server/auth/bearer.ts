import { createHash, randomBytes } from "node:crypto";

export const BEARER_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function newBearerToken(): string {
  return `tappen_${randomBytes(32).toString("base64url")}`;
}

export function hashBearerToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bearerExpiresAt(now: Date): Date {
  return new Date(now.getTime() + BEARER_TTL_MS);
}

export function bearerRowUsable(
  row: { expiresAt: Date; deletedAt: Date | null } | null,
  now: Date,
): boolean {
  if (!row || row.deletedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}
