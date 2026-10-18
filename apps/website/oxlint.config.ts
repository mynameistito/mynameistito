import { defineConfig } from "oxlint";
import { jsPluginSettings, selectJsPlugins } from "ultracite/oxlint/js-plugins";
import react from "ultracite/oxlint/react";
import shadcn from "ultracite/oxlint/shadcn";
import tanstack from "ultracite/oxlint/tanstack";
import tanstackJsPlugins from "ultracite/oxlint/tanstack/js-plugins";

import base, { jsPlugins as commonJsPlugins } from "../../oxlint.config.ts";

const reactDoctor = selectJsPlugins(["react-doctor"]);

export default defineConfig({
  extends: [base, react, shadcn, tanstack, tanstackJsPlugins, reactDoctor],
  jsPlugins: [
    ...commonJsPlugins.jsPlugins,
    ...shadcn.jsPlugins,
    ...tanstackJsPlugins.jsPlugins,
    ...reactDoctor.jsPlugins,
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
