import { Stack } from "alchemy";
import { providers, state, Website } from "alchemy/Cloudflare";
import { gen } from "effect/Effect";

export default Stack(
  "mynameistito",
  {
    providers: providers(),
    state: state(),
  },
  gen(function* deployWebsite() {
    const website = yield* Website.Vite("Website", {
      compatibility: {
        date: "2026-10-07",
        flags: ["nodejs_compat"],
      },
      name: "mynameistito-prod",
      rootDir: "apps/website",
    });

    return { url: website.url };
  })
);
