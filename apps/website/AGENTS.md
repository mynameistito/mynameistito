# Website Effect conventions

1. Put effectful application work in Effect programs. Use `Effect.gen` for orchestration, `Effect.fn` for named operations, and typed errors for expected failures. Check: I/O, configuration, time, randomness, storage, and remote calls enter through Effects or explicit adapters.
2. Keep deterministic domain rules as pure modules. Parse external data at the edge with Effect Schema, then pass parsed values inward. Check: pure rules can be tested without a Worker, browser, or network.
3. Keep React rendering and local UI state in React. Run Effect programs at browser/framework entrypoints; keep timers, event objects, and DOM APIs in those adapters. Check: Effects do not leak into JSX or replace ordinary UI state.
4. Keep TanStack and Cloudflare handlers as thin Promise-returning adapters. Decode requests, run the Effect program, and map typed outcomes to framework responses there. Check: application policy is not duplicated in handlers.
5. Put runtime bindings and secrets behind an Effect-owned configuration module. Keep secrets redacted after ingress. Check: application workflows do not read `process.env` or dynamically import Cloudflare bindings.
6. Use Effect `Cache` for TTL memoization when its lifecycle fits. Create caches once in their owning Layer and avoid mutable module-level TTL state. Check: cache lifetime and failure behavior are explicit and tested.
7. Test Effect programs through their public services and real local seams. Keep tests in `src/**/__tests__`; control time and failures deterministically. Check: no module mocks or wall-clock sleeps were added.
