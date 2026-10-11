import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const cloudflareWorkersModule = "cloudflare:workers";
const require = createRequire(import.meta.url);
const takumiWasmPath = require.resolve("@takumi-rs/wasm/takumi_wasm_bg.wasm");
const takumiWasmAssetPlugin: Plugin = {
  name: "takumi-wasm-asset",
  apply: "build",
  generateBundle(outputOptions) {
    if (path.basename(outputOptions.dir ?? "") !== "client") {
      return;
    }

    this.emitFile({
      type: "asset",
      fileName: "assets/takumi_wasm_bg.wasm",
      source: readFileSync(takumiWasmPath),
    });
  },
};

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    takumiWasmAssetPlugin,
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    alias: [
      {
        find: /^@takumi-rs\/wasm\/auto$/u,
        replacement: fileURLToPath(
          new URL("src/lib/takumi-wasm.ts", import.meta.url)
        ),
      },
    ],
    tsconfigPaths: true,
  },
  build: {
    rolldownOptions: {
      external: [cloudflareWorkersModule],
      platform: "browser",
    },
  },
  environments: {
    ssr: { resolve: { external: ["node:async_hooks", "node:stream"] } },
  },
  ssr: {
    noExternal: true,
    resolve: { conditions: ["module", "workerd", "development|production"] },
    target: "webworker",
  },
  server: { port: 3000 },
});

export default config;
