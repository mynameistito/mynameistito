declare module "cloudflare:workers" {
  /** Workflow data returned from a durable step. */
  export type WorkflowResult = Readonly<
    Record<string, string | number | boolean>
  >;

  /** A Cloudflare Workflow event delivered to a Workflow Entrypoint. */
  export interface WorkflowEvent<Params = Record<string, never>> {
    readonly payload: Params;
    readonly timestamp: Date;
    readonly instanceId: string;
    readonly workflowName: string;
  }

  /** Retry policy for durable Workflow steps. */
  export interface WorkflowStepOptions {
    readonly retries?: {
      readonly limit?: number;
      readonly delay?: string;
      readonly backoff?: "linear" | "exponential";
    };
  }

  /** Context supplied by Cloudflare to a Workflow Entrypoint. */
  export type WorkflowContext = Readonly<Record<string, never>>;

  /** Durable operations available to a Workflow Entrypoint. */
  export interface WorkflowStep {
    /** Runs and checkpoints a durable Workflow operation. */
    readonly do: <T extends WorkflowResult>(
      name: string,
      options: WorkflowStepOptions,
      callback: () => Promise<T>
    ) => Promise<T>;
  }

  /** Base class for Cloudflare Workflows. */
  export abstract class WorkflowEntrypoint<
    Env = Record<string, never>,
    Params = Record<string, never>,
  > {
    /** Bindings available to this Workflow instance. */
    protected readonly env: Env;

    /** Creates an entrypoint for a Workflow run. */
    constructor(ctx: WorkflowContext, env: Env);

    /** Executes the Workflow run. */
    abstract run(
      event: Readonly<WorkflowEvent<Params>>,
      step: WorkflowStep
    ): Promise<WorkflowResult>;
  }
}
