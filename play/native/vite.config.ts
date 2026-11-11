import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

function pkg(name: string) {
  return path.resolve(root, "node_modules", name);
}

const apiProxy = {
  "/api": {
    target: "https://play.tappen.app",
    changeOrigin: true,
    secure: true,
  },
  "/ws": {
    target: "wss://play.tappen.app",
    changeOrigin: true,
    secure: true,
    ws: true,
  },
};

function stripServiceWorker(): Plugin {
  return {
    name: "strip-service-worker",
    apply: "build",
    closeBundle() {
      fs.rmSync(path.resolve(root, "dist/service-worker.js"), { force: true });
    },
  };
}

export default defineConfig({
  plugins: [react(), stripServiceWorker()],
  publicDir: path.resolve(root, "../public"),
  resolve: {
    alias: [
      {
        find: "@/client/links",
        replacement: path.resolve(root, "src/platform/links.ts"),
      },
      { find: "@", replacement: path.resolve(root, "../src") },
      { find: "next/link", replacement: path.resolve(root, "src/shims/next-link.tsx") },
      { find: "next/image", replacement: path.resolve(root, "src/shims/next-image.tsx") },
      {
        find: "next/navigation",
        replacement: path.resolve(root, "src/shims/next-navigation.tsx"),
      },
      // One React for files that live in play/src and files that live here.
      { find: /^react$/, replacement: pkg("react") },
      {
        find: /^react\/(.+)/,
        replacement: (id) => id.replace(/^react\//, `${pkg("react")}/`),
      },
      { find: /^react-dom$/, replacement: pkg("react-dom") },
      {
        find: /^react-dom\/(.+)/,
        replacement: (id) => id.replace(/^react-dom\//, `${pkg("react-dom")}/`),
      },
      { find: "@heroicons/react", replacement: pkg("@heroicons/react") },
      { find: "@tanstack/react-query", replacement: pkg("@tanstack/react-query") },
      { find: "@trpc/client", replacement: pkg("@trpc/client") },
      { find: "@trpc/react-query", replacement: pkg("@trpc/react-query") },
      { find: "@trpc/server", replacement: pkg("@trpc/server") },
      { find: "react-tinder-card", replacement: pkg("react-tinder-card") },
      { find: "react-router-dom", replacement: pkg("react-router-dom") },
      { find: "superjson", replacement: pkg("superjson") },
    ],
  },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
});
