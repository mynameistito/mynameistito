/** Minimal base class for Workflow entrypoints in Node tests. */
export class WorkflowEntrypoint<Env, Params> {
  declare readonly params: Params;
  protected readonly ctx: ExecutionContext;
  protected readonly env: Env;

  /** Creates the test entrypoint with the supplied runtime bindings. */
  constructor(ctx: ExecutionContext, bindings: Env) {
    this.ctx = ctx;
    this.env = bindings;
  }
}
