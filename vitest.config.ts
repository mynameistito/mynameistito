import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("apps/website/src", import.meta.url)),
      "cloudflare:workers": fileURLToPath(
        new URL(
          "apps/website/src/__tests__/cloudflare-workers.ts",
          import.meta.url
        )
      ),
    },
  },
  test: {
    coverage: {
      include: ["packages/*/src/**/*.ts"],
      provider: "v8",
      reporter: ["text", "lcov"],
      reportsDirectory: "./coverage",
    },
    environment: "node",
    include: [
      "packages/*/__tests__/**/*.test.ts",
      "apps/website/src/**/__tests__/**/*.test.ts",
    ],
  },
});
