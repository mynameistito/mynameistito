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
