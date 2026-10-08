import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const cloudflareWorkersModule = "cloudflare:workers";

const config = defineConfig({
  plugins: [devtools(), tailwindcss(), tanstackStart(), viteReact()],
  resolve: {
    tsconfigPaths: true,
  },
  build: { rolldownOptions: { external: [cloudflareWorkersModule] } },
  server: { port: 3000 },
});

export default config;
