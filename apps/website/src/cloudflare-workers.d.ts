declare module "cloudflare:workers" {
  /** Runtime bindings supplied to this Worker. */
  export const env: unknown;

  /** Base class for stateful Cloudflare Durable Objects. */
  export class DurableObject<Env = unknown> {
    /** Durable Object instance state and persistent storage. */
    protected readonly ctx: DurableObjectState;

    /** Environment bindings for the hosting Worker. */
    protected readonly env: Env;

    /** Create a Durable Object instance. */
    constructor(ctx: DurableObjectState, env: Env);
  }

  /** Runtime state provided to a Durable Object instance. */
  export interface DurableObjectState {
    /** Persistent storage for the object. */
    readonly storage: DurableObjectStorage;
  }

  /** Storage operations available inside a Durable Object. */
  export interface DurableObjectStorage {
    /** Delete a stored key. */
    readonly delete: (key: string) => Promise<boolean>;

    /** Read a stored value. */
    readonly get: <T>(key: string) => Promise<T | undefined>;

    /** List stored entries, optionally filtered by key prefix. */
    readonly list: <T>(options?: {
      readonly prefix?: string;
    }) => Promise<Map<string, T>>;

    /** Store a value. */
    readonly put: <T>(key: string, value: T) => Promise<void>;

    /** Schedule the object's alarm. */
    readonly setAlarm: (time: number) => Promise<void>;

    /** Execute storage operations atomically. */
    readonly transaction: <T>(
      closure: (transaction: DurableObjectStorage) => Promise<T>
    ) => Promise<T>;
  }
}
