import type { ReactNode } from "react";

import HostPage from "@/app/host/page";
import JoinPage from "@/app/join/page";
import OfflinePage from "@/app/offline/page";

import { AccountScreen } from "./screens/account";
import { ClaimScreen } from "./screens/claim";
import { HomeScreen } from "./screens/home";
import { RoomRoute } from "./screens/room";

export type NativeScreen = {
  path: string;
  element: ReactNode;
  area: "play" | "hub";
};

export const screens: NativeScreen[] = [
  { path: "/", element: <HomeScreen />, area: "play" },
  { path: "/account", element: <AccountScreen />, area: "play" },
  { path: "/host", element: <HostPage />, area: "play" },
  { path: "/join", element: <JoinPage />, area: "play" },
  { path: "/room/:roomId", element: <RoomRoute />, area: "play" },
  { path: "/claim", element: <ClaimScreen />, area: "play" },
  { path: "/offline", element: <OfflinePage />, area: "play" },
];

/**
 * Hub features are not built yet. Add a `screens` entry (area: "hub") and
 * call the client from platform/api.ts. Suggested slots:
 * - /decks and /decks/new — deck list and create. Premium is the extra-deck gate.
 * - /profile — entitlement and display name. Account deletion is /account.
 * - /skins — the Premium skin builder. Skins are not in-app purchases.
 */
export const futureHubScreens: Array<{ path: string; notes: string }> = [
  { path: "/decks", notes: "deck.list and deck.create" },
  { path: "/profile", notes: "account.entitlement, profile, delete account" },
  { path: "/skins", notes: "Premium skin builder, not a catalog of purchases" },
];
