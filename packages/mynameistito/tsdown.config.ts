import { defineConfig } from "tsdown";

export default defineConfig({
  clean: true,
  dts: false,
  entry: {
    cli: "src/cli.ts",
    index: "src/index.ts",
  },
  format: "esm",
  outExtensions: () => ({ js: ".js" }),
  platform: "node",
  target: "node20",
});
