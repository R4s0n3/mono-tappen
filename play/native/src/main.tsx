import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { configureRuntime } from "@/client/runtime";
import { TRPCReactProvider } from "@/trpc/react";

import { App } from "./App";
import { getAccessToken } from "./platform/auth";
import "./styles.css";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "https://play.tappen.app").replace(/\/$/, "");
const wsUrl = import.meta.env.VITE_WS_URL || "wss://play.tappen.app/ws";

configureRuntime({
  platform: "ios",
  apiBaseUrl,
  wsUrl,
  showNsfwBadge: false,
  getAccessToken,
});

const root = document.getElementById("root");
if (!root) throw new Error("missing root");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <TRPCReactProvider>
        <App />
      </TRPCReactProvider>
    </BrowserRouter>
  </StrictMode>,
);
