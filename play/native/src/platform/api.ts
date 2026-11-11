/**
 * Data access for the native shell.
 *
 * `api` is play's tRPC router (cards, rooms, skins, account.entitlement),
 * aimed at VITE_API_BASE_URL. The website keeps using the same client
 * against its own origin.
 *
 * Hub screens are not in this build. When they land, add them as routes in
 * `screens.tsx` and call tRPC from here, not with a one-off fetch:
 * - decks (list, create): Premium's extra-deck gate already lives on hub
 * - profile: entitlement, name, account deletion
 * - skins: catalog and ownership, bought through `purchase` (StoreKit 2)
 *
 * Those procedures live on hub today. Both apps share one Postgres, so they
 * can move onto play or this file can grow a second client pointed at hub.
 * Either way the screen imports the client from this module.
 */
export { api } from "@/trpc/react";

export { getAccessToken, signInWithApple } from "./auth";
export { purchase, purchaseConfig, storeKitProducts } from "./purchases";
