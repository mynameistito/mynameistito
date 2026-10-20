import type { DurableObjectState } from "cloudflare:workers";

/** Node test seam for the Worker-only runtime module. */
import type { RuntimeBindings } from "@/env";

type MutableRuntimeBindings = {
  -readonly [Key in keyof RuntimeBindings]: RuntimeBindings[Key];
};

export const env: MutableRuntimeBindings = {};

/** Minimal base class for Worker-only Durable Objects in Node tests. */
export class DurableObject {
  readonly ctx: DurableObjectState;

  /** Creates the test double with a supplied Durable Object context. */
  constructor(ctx: DurableObjectState) {
    this.ctx = ctx;
  }
}

/** Minimal base class for Worker-only Workflows in Node tests. */
export class WorkflowEntrypoint<Env, Params = unknown> {
  /** Runtime environment passed to the workflow instance. */
  readonly env: Env;

  /** Creates the test double with the runtime environment. */
  constructor(_ctx: unknown, env: Env) {
    this.env = env;
  }

  /** Keeps the runtime parameter type visible to workflow subclasses. */
  declare readonly __testParams?: Params;
}
