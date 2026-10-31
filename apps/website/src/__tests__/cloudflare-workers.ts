import type { DurableObjectState } from "cloudflare:workers";

/** Node test seam for the Worker-only runtime module. */
import type { RuntimeBindings } from "@/env";

type MutableRuntimeBindings = {
  -readonly [Key in keyof RuntimeBindings]: RuntimeBindings[Key];
};

export const env: MutableRuntimeBindings = {};

export { WorkflowEntrypoint } from "./workflow-entrypoint";

/** Minimal base class for Worker-only Durable Objects in Node tests. */
export class DurableObject<Env = unknown> {
  readonly ctx: DurableObjectState;
  readonly env: Env | undefined;

  /** Creates the test double with a supplied Durable Object context. */
  constructor(ctx: DurableObjectState, bindings?: Env) {
    this.ctx = ctx;
    this.env = bindings;
  }
}
