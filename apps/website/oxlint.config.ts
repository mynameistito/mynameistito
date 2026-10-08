import { defineConfig } from "oxlint";
import { jsPluginSettings } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

import base, { jsPlugins as commonJsPlugins } from "../../oxlint.config.ts";

export default defineConfig({
  extends: [base, react, shadcn, tanstack, tanstackJsPlugins],
  jsPlugins: [
    ...commonJsPlugins.jsPlugins,
    ...shadcn.jsPlugins,
    ...tanstackJsPlugins.jsPlugins,
  ],
  settings: jsPluginSettings,
  overrides: [
    {
      files: ["src/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          {
            patterns: [
              {
                regex: "^\\.\\./",
                message: "Use the @/* alias for imports between src modules.",
              },
            ],
          },
        ],
      },
    },
  ],
});
