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

const isAlchemyCloudflareBuild =
  process.env.ALCHEMY_CLOUDFLARE_VITE_INJECTED === "1";

const require = createRequire(import.meta.url);
const takumiWasmPath = require.resolve("@takumi-rs/wasm/takumi_wasm_bg.wasm");

/** Keeps standalone Vite builds valid; Alchemy uses Cloudflare's native WASM handling. */
const standaloneTakumiWasmPlugin: Plugin = {
  name: "standalone-takumi-wasm",
  enforce: "pre",
  apply: (_config, { command }) =>
    command === "build" && !isAlchemyCloudflareBuild,
  resolveId(source, importer) {
    const normalizedImporter = importer?.replaceAll("\\", "/");

    return source === "../pkg/takumi_wasm_bg.wasm" &&
      normalizedImporter?.endsWith("/bundlers/workerd.js")
      ? { external: true, id: "./takumi_wasm_bg.wasm" }
      : undefined;
  },
  writeBundle(outputOptions) {
    if (path.basename(outputOptions.dir ?? "") !== "server") {
      return;
    }

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
    standaloneTakumiWasmPlugin,
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
