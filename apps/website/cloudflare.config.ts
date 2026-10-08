import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "effect-first-tanstack-website",
    compatibilityDate: "2026-09-25",
    compatibilityFlags: ["nodejs_compat"],
    entrypoint: "@tanstack/react-start/server-entry",
    observability: {
      enabled: true,
    },
  },
});
