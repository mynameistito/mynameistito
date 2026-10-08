import { DurableObject } from "cloudflare:workers";
import {
  check,
  decodeUnknownSync,
  isPattern,
  String as SchemaString,
  Struct,
} from "effect/Schema";

interface Env {
  readonly VISITOR_COUNTER: DurableObjectNamespace<VisitorCounter>;
}

interface VisitorCounts {
  readonly daily: number;
  readonly live: number;
}

const liveWindowMs = 2 * 60 * 1000;
const heartbeatMs = 60 * 1000;
const VisitorRequest = Struct({
  visitorId: SchemaString.pipe(check(isPattern(/^[\da-f-]{36}$/iu))),
});

/** Local Cloudflare Worker that hosts the local visitor Durable Object. */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    let visitorId: string;
    try {
      ({ visitorId } = decodeUnknownSync(VisitorRequest)(payload));
    } catch {
      return Response.json({ error: "Invalid visitor." }, { status: 400 });
    }

    const objectId = env.VISITOR_COUNTER.idFromName("site");
    const counter = env.VISITOR_COUNTER.get(objectId);
    return counter.fetch(
      new Request("https://visitor-counter.local/track", {
        body: JSON.stringify({ visitorId }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );
  },
};

/** Cloudflare Durable Object used by local development. */
export class VisitorCounter extends DurableObject<Env> {
  /**
   * Track a visitor and return current daily and live counts.
   * @param request - The tracking request.
   * @returns The current daily and live counts.
   */
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(null, { status: 405 });
    }

    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    let visitorId: string;
    try {
      ({ visitorId } = decodeUnknownSync(VisitorRequest)(payload));
    } catch {
      return Response.json({ error: "Invalid visitor." }, { status: 400 });
    }

    const counts = await this.ctx.storage.transaction(async (storage) => {
      const timestamp = Date.now();
      const today = new Date(timestamp).toISOString().slice(0, 10);
      const dailyKey = `daily:${today}`;
      const seenKey = `seen:${today}:${visitorId}`;
      const liveKey = `live:${visitorId}`;

      const dailyKeys = await storage.list({ prefix: "daily:" });
      const expiredDaily = [...dailyKeys.keys()].filter(
        (key) => !key.endsWith(today)
      );
      await Promise.all(expiredDaily.map((key) => storage.delete(key)));
      const seenKeys = await storage.list({ prefix: "seen:" });
      const expiredSeen = [...seenKeys.keys()].filter(
        (key) => !key.includes(today)
      );
      await Promise.all(expiredSeen.map((key) => storage.delete(key)));
      const liveVisitors = await storage.list<number>({ prefix: "live:" });
      const expiredLive = [...liveVisitors]
        .filter(([, lastSeen]) => timestamp - lastSeen > liveWindowMs)
        .map(([key]) => key);
      await Promise.all(expiredLive.map((key) => storage.delete(key)));

      const seen = await storage.get<boolean>(seenKey);
      if (!seen) {
        const daily = (await storage.get<number>(dailyKey)) ?? 0;
        await storage.put(seenKey, true);
        await storage.put(dailyKey, daily + 1);
      }
      await storage.put(liveKey, timestamp);
      const active = await storage.list({ prefix: "live:" });
      return {
        daily: (await storage.get<number>(dailyKey)) ?? 0,
        live: active.size,
      } satisfies VisitorCounts;
    });

    await this.ctx.storage.setAlarm(Date.now() + heartbeatMs);
    return Response.json(counts, {
      headers: { "cache-control": "no-store" },
    });
  }

  /**
   * Remove expired live visitors when the Durable Object alarm fires.
   * @returns Nothing.
   */
  async alarm(): Promise<void> {
    const timestamp = Date.now();
    const active = await this.ctx.storage.list<number>({ prefix: "live:" });
    const expired = [...active]
      .filter(([, lastSeen]) => timestamp - lastSeen > liveWindowMs)
      .map(([key]) => key);
    await Promise.all(expired.map((key) => this.ctx.storage.delete(key)));
    const remaining = await this.ctx.storage.list({ prefix: "live:" });
    if (remaining.size > 0) {
      await this.ctx.storage.setAlarm(timestamp + heartbeatMs);
    }
  }
}
