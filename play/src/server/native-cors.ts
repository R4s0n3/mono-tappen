/**
 * Origins allowed to call play's tRPC from the Capacitor shell and from
 * local Vite (dev and preview). The website is same-origin and does not
 * need these headers. Auth stays a cookie on the website; the shell will
 * send a bearer token in M2.
 */
const NATIVE_ORIGINS = new Set(["capacitor://localhost", "ionic://localhost"]);

export function nativeOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (NATIVE_ORIGINS.has(origin)) return true;
  try {
    const url = new URL(origin);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const http = url.protocol === "http:" || url.protocol === "https:";
    return local && http;
  } catch {
    return false;
  }
}

export const NATIVE_CORS_HEADERS = "content-type, x-trpc-source, trpc-accept, authorization";
