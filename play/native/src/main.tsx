import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { configureRuntime } from "@/client/runtime";
import { TRPCReactProvider } from "@/trpc/react";

import { App } from "./App";
import { resolveNativeEndpoints } from "./endpoints";
import { getAccessToken } from "./platform/auth";
import "./styles.css";

const endpoints = import.meta.env.PROD
  ? resolveNativeEndpoints({ prod: true })
  : resolveNativeEndpoints({
      prod: false,
      apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
      wsUrl: import.meta.env.VITE_WS_URL,
    });

configureRuntime({
  platform: "ios",
  apiBaseUrl: endpoints.apiBaseUrl,
  wsUrl: endpoints.wsUrl,
  showNsfwBadge: false,
  accountActions: false,
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
