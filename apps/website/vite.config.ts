import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const cloudflareWorkersModule = "cloudflare:workers";

const config = defineConfig(({ command }) => ({
  plugins: [
    ...(command === "serve"
      ? [
          cloudflare({
            configPath: "./wrangler.jsonc",
            config: (workerConfig) => {
              workerConfig.services = [
                {
                  binding: "VISITOR_SERVICE",
                  service: "mynameistito-visitors-local",
                },
              ];
            },
            auxiliaryWorkers: [{ configPath: "./wrangler.visitors.jsonc" }],
            viteEnvironment: { name: "ssr" },
          }),
        ]
      : []),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: { rolldownOptions: { external: [cloudflareWorkersModule] } },
  server: { port: 3000 },
}));

export default config;
