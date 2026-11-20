import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  readAssets,
  uploadAssets,
} from "@alchemy.run/cloudflare/Workers/Assets";
import { viteBuildInProcess } from "@alchemy.run/cloudflare/Workers/Sources/Vite";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import {
  createScriptDeployment,
  createScriptVersion,
  getScriptSetting,
  getScriptVersion,
  listScriptDeployments,
  listScriptVersions,
} from "@distilled.cloud/cloudflare/workers";
import type {
  GetScriptSettingResponse,
  PutScriptMetadataObservability,
} from "@distilled.cloud/cloudflare/workers";
import { BunServices } from "@effect/platform-bun";
import type { BundleFile } from "alchemy/Bundle/Bundle";
import { noopSession } from "alchemy/Report";
import { Effect, Redacted, Schedule, Schema } from "effect";
import { layer as httpLayer } from "effect/http/FetchHttpClient";

const Config = Schema.Struct({
  CLOUDFLARE_ACCOUNT_ID: Schema.NonEmptyString,
  CLOUDFLARE_API_TOKEN: Schema.NonEmptyString,
  STAGE: Schema.Literal("prod"),
});

const Binding = Schema.StructWithRest(
  Schema.Struct({ name: Schema.String, type: Schema.String }),
  [Schema.Record(Schema.String, Schema.Json)]
);

const parseBindings = Schema.decodeUnknownSync(Schema.Array(Binding));

const VersionSource = Schema.Struct({
  result: Schema.Struct({
    annotations: Schema.Struct({
      "workers/commit_sha": Schema.optional(Schema.String),
      "workers/tag": Schema.optional(Schema.String),
    }),
  }),
});

const { CLOUDFLARE_ACCOUNT_ID: accountId, CLOUDFLARE_API_TOKEN: rawToken } =
  Schema.decodeUnknownSync(Config)(process.env);

const apiToken = Redacted.make(rawToken);
const scriptName = "mynameistito";
const target = { accountId, scriptName };
const root = path.resolve("apps/website");

// Runs in the trusted checkout on the GitHub-hosted deploy runner.
const git = (...args: string[]) =>
  // oxlint-disable-next-line sonarjs/no-os-command-from-path -- Uses the runner's Git executable.
  execFileSync("git", args, { encoding: "utf-8" }).trim();

const byName = (left: typeof Binding.Type, right: typeof Binding.Type) =>
  left.name.localeCompare(right.name);

const moduleMime = {
  ".js": "application/javascript+module",
  ".map": "application/source-map",
  ".wasm": "application/wasm",
};

const toModule = ({ content, path: filename }: BundleFile) => {
  const extension = path.extname(filename);

  const type = Object.entries(moduleMime).find(
    ([suffix]) => suffix === extension
  )?.[1];

  assert.ok(
    type !== undefined,
    `Unexpected Worker module extension: ${extension}`
  );

  return new File([Buffer.from(content)], filename, { type });
};

const Runtime = Schema.Struct({
  compatibilityDate: Schema.NonEmptyString,
  compatibilityFlags: Schema.Array(Schema.String),
  exports: Schema.Record(
    Schema.String,
    Schema.Struct({
      storage: Schema.Literals(["sqlite", "legacy-kv"]),
      type: Schema.Literal("durable-object"),
    })
  ),
});

const uploadObservability = (
  observability: GetScriptSettingResponse["observability"]
): PutScriptMetadataObservability | undefined => {
  if (!observability) {
    return undefined;
  }

  const { issues, logs, traces } = observability;

  return {
    enabled: observability.enabled,
    headSamplingRate: observability.headSamplingRate,
    issues:
      issues?.enabled === true || issues?.enabled === false
        ? { enabled: issues.enabled }
        : undefined,
    logs: logs
      ? {
          ...logs,
          destinations: logs.destinations ?? undefined,
          persist: logs.persist ?? undefined,
        }
      : undefined,
    redactQueryString: observability.redactQueryString ?? undefined,
    traces: traces
      ? {
          ...traces,
          destinations: traces.destinations ?? undefined,
          enabled: traces.enabled ?? undefined,
          persist: traces.persist ?? undefined,
          propagationPolicy: traces.propagationPolicy ?? undefined,
        }
      : undefined,
  };
};

const activeVersion = Effect.gen(function* readActiveVersion() {
  const { deployments } = yield* listScriptDeployments(target);
  const versions = deployments[0]?.versions ?? [];
  const [current] = versions;

  if (versions.length !== 1 || current?.percentage !== 100) {
    return yield* Effect.fail(
      new Error("Expected one active production version.")
    );
  }

  return current.versionId;
});

const verifySource = async (versionId: string, head: string) => {
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${scriptName}/versions/${versionId}`;

  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${Redacted.value(apiToken)}` },
    signal: AbortSignal.timeout(30_000),
  });

  if (!response.ok) {
    throw new Error(
      `Could not read the active version source (HTTP ${response.status}).`
    );
  }

  const { result } = Schema.decodeUnknownSync(VersionSource)(
    await response.json()
  );

  const previous =
    result.annotations["workers/commit_sha"] ??
    result.annotations["workers/tag"];

  if (previous === undefined || !/^[a-f\d]{40}$/u.test(previous)) {
    throw new Error("The active version has no verified source commit.");
  }

  if (previous !== head) {
    git("fetch", "--no-tags", "--depth=1", "origin", previous);

    if (
      git("diff", "--name-only", previous, head, "--", "alchemy.run.ts") !== ""
    ) {
      throw new Error(
        "The infrastructure declaration changed and requires Alchemy."
      );
    }
  }
};

await Effect.runPromise(
  Effect.gen(function* deployWebsiteCode() {
    const priorId = yield* activeVersion;
    const { items } = yield* listScriptVersions(target);

    // Strict inheritance resolves against the latest upload.
    if (items?.[0]?.id !== priorId) {
      return yield* Effect.fail(
        new Error(
          "The latest Worker upload is not the active production version."
        )
      );
    }

    const head = git("rev-parse", "HEAD");

    yield* Effect.tryPromise(async () => {
      await verifySource(priorId, head);
    });

    const { resources: prior } = yield* getScriptVersion({
      ...target,
      versionId: priorId,
    });

    const settings = yield* getScriptSetting(target);
    const { scriptRuntime: runtime } = prior;
    const bindings = parseBindings(prior.bindings);

    const compatibility = Schema.decodeUnknownSync(Runtime)(runtime);

    const previousDirectory = process.cwd();

    process.chdir(root);

    const build = yield* viteBuildInProcess(
      root,
      {},
      {
        compatibilityDate: compatibility.compatibilityDate,
        compatibilityFlags: [...compatibility.compatibilityFlags],
        main: "worker.ts",
      }
    ).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          process.chdir(previousDirectory);
        })
      )
    );

    const bundle = yield* build.serverBundle;

    if (bundle === undefined || build.clientDirectory === undefined) {
      return yield* Effect.fail(
        new Error("The production build has no Worker bundle or client assets.")
      );
    }

    const assets = yield* readAssets({
      base: build.base,
      directory: build.clientDirectory,
    });

    const { jwt } = yield* uploadAssets(
      accountId,
      scriptName,
      assets,
      noopSession
    );

    const uploaded = yield* createScriptVersion({
      ...target,
      bindingsInherit: "strict",
      files: bundle.files.map(toModule),
      metadata: {
        annotations: {
          workersMessage:
            "Website code deploy after an Alchemy state read failure",
          workersTag: head,
        },
        assets: { config: assets.config, jwt },
        bindings: bindings.map(({ name, type }) => ({
          name,
          type: type === "assets" ? type : "inherit",
        })),
        compatibilityDate: compatibility.compatibilityDate,
        compatibilityFlags: [...compatibility.compatibilityFlags],
        exports: compatibility.exports,
        mainModule: bundle.files[0].path,
        observability: uploadObservability(settings.observability),
        usageModel: runtime?.usageModel ?? undefined,
      },
    });

    if (
      uploaded.id === null ||
      uploaded.id === undefined ||
      uploaded.id === ""
    ) {
      return yield* Effect.fail(
        new Error("Cloudflare did not return a Worker version ID.")
      );
    }

    const { resources: candidate } = yield* getScriptVersion({
      ...target,
      versionId: uploaded.id,
    }).pipe(Effect.retry({ schedule: Schedule.spaced("1 second"), times: 4 }));

    assert.deepEqual(
      parseBindings(candidate.bindings).toSorted(byName),
      bindings.toSorted(byName)
    );
    assert.deepEqual(candidate.script?.handlers, prior.script?.handlers);
    assert.deepEqual(
      candidate.script?.namedHandlers,
      prior.script?.namedHandlers
    );
    assert.deepEqual(candidate.scriptRuntime?.exports, runtime?.exports);
    assert.equal(
      candidate.scriptRuntime?.compatibilityDate,
      compatibility.compatibilityDate
    );
    assert.deepEqual(
      candidate.scriptRuntime?.compatibilityFlags,
      compatibility.compatibilityFlags
    );
    assert.equal(
      yield* activeVersion,
      priorId,
      "Production changed before activation."
    );

    yield* createScriptDeployment({
      ...target,
      strategy: "percentage",
      versions: [{ percentage: 100, versionId: uploaded.id }],
    });

    console.log(
      `Deployed Worker version ${uploaded.id} from ${head} after the Alchemy state read failure.`
    );

    return uploaded.id;
  }).pipe(
    Effect.provide(fromApiToken({ accountId, apiToken })),
    Effect.provide(httpLayer),
    Effect.provide(BunServices.layer)
  )
);
