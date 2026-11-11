import { hashBearerToken } from "./bearer";

export type RequestSession = {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
};

export async function resolveRequestSession(
  headers: Headers,
  deps: {
    lookupBearer: (
      tokenHash: string,
    ) => Promise<{ session: RequestSession; bearerTokenHash: string } | null>;
    cookieSession: () => Promise<RequestSession | null>;
  },
): Promise<{ session: RequestSession | null; bearerTokenHash: string | null }> {
  const header = headers.get("authorization");
  if (header && /^Bearer\s+/i.test(header)) {
    const token = header.replace(/^Bearer\s+/i, "").trim();
    if (!token) return { session: null, bearerTokenHash: null };
    const found = await deps.lookupBearer(hashBearerToken(token));
    return found ?? { session: null, bearerTokenHash: null };
  }
  return { session: await deps.cookieSession(), bearerTokenHash: null };
}
