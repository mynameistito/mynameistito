import path from "node:path";

import { Stack } from "alchemy";
import {
  Access,
  DurableObject,
  providers,
  state,
  Turnstile,
  Worker,
} from "alchemy/Cloudflare";
import { gen } from "effect/Effect";

const artifactDirectory = Bun.env.ALCHEMY_E2E_ARTIFACT;
if (!artifactDirectory) {
  throw new Error("ALCHEMY_E2E_ARTIFACT is required");
}

const e2eHostname = "e2e.mynameistito.com";
const e2eName = "mynameistito-e2e";
const workerMain = path.join(artifactDirectory, "server", "server.js");
const assetsDirectory = path.join(artifactDirectory, "client");

export default Stack(
  e2eName,
  {
    providers: providers(),
    state: state(),
  },
  gen(function* deployE2E() {
    const contactTurnstile = yield* Turnstile.Widget("E2EContactTurnstile", {
      domains: [e2eHostname],
      mode: "managed",
    });

    const accessPolicy = yield* Access.Policy("E2EAccessPolicy", {
      decision: "allow",
      include: [{ email: "tito@kzg.gg" }],
      name: `${e2eName}-owner-only`,
      sessionDuration: "4h",
    });

    const accessApplication = yield* Access.Application("E2EAccess", {
      appLauncherVisible: false,
      domain: e2eHostname,
      name: e2eName,
      policies: [accessPolicy],
      sessionDuration: "4h",
      type: "self_hosted",
    });

    const worker = yield* Worker("WebsiteE2E", {
      access: accessApplication,
      assets: { directory: assetsDirectory },
      bundle: false,
      compatibility: {
        date: "2026-10-07",
        flags: ["nodejs_compat"],
      },
      domain: e2eHostname,
      env: {
        TURNSTILE_SECRET: contactTurnstile.secret,
        TURNSTILE_SITEKEY: contactTurnstile.sitekey,
        VISITOR_COUNTER: DurableObject("VisitorCounter", {
          className: "VisitorCounter",
        }),
      },
      main: workerMain,
      name: e2eName,
      workersDev: false,
    });

    return { url: worker.url };
  })
);
