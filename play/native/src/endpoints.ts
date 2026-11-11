export const PRODUCTION_API_BASE_URL = "https://play.tappen.app";
export const PRODUCTION_WS_URL = "wss://play.tappen.app/ws";

/**
 * A production bundle always calls play.tappen.app. Dev and preview may
 * override the URLs; those overrides are not compiled into a release build.
 */
export function resolveNativeEndpoints(input: {
  prod: boolean;
  apiBaseUrl?: string;
  wsUrl?: string;
}): { apiBaseUrl: string; wsUrl: string } {
  if (input.prod) {
    return { apiBaseUrl: PRODUCTION_API_BASE_URL, wsUrl: PRODUCTION_WS_URL };
  }
  return {
    apiBaseUrl: (input.apiBaseUrl || PRODUCTION_API_BASE_URL).replace(/\/$/, ""),
    wsUrl: input.wsUrl || PRODUCTION_WS_URL,
  };
}
