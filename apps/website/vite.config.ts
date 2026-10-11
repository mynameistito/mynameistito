import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

const cloudflareWorkersModule = "cloudflare:workers";
const require = createRequire(import.meta.url);
const takumiWasmPath = require.resolve("@takumi-rs/wasm/takumi_wasm_bg.wasm");

/** Keeps Takumi's WASM as a Worker CompiledWasm module instead of runtime bytes. */
const takumiWasmModulePlugin: Plugin = {
  name: "takumi-wasm-module",
  enforce: "pre",
  apply: "build",
  resolveId(source, importer) {
    const normalizedImporter = importer?.replaceAll("\\", "/");
    if (
      source === "../pkg/takumi_wasm_bg.wasm" &&
      normalizedImporter?.endsWith("/bundlers/workerd.js")
    ) {
      return { external: true, id: "./takumi_wasm_bg.wasm" };
    }
  },
  writeBundle(outputOptions) {
    if (path.basename(outputOptions.dir ?? "") !== "server") {
      return;
    }

    // Alchemy's Worker module rules compile this adjacent file before execution.
    writeFileSync(
      path.join(outputOptions.dir ?? "", "takumi_wasm_bg.wasm"),
      readFileSync(takumiWasmPath)
    );
  },
};

const config = defineConfig({
  plugins: [
    devtools(),
    tailwindcss(),
    takumiWasmModulePlugin,
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
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
