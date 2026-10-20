import { DurableObject } from "cloudflare:workers";

import { reserveSearchRequestSlot } from "./search-rate-limit";

/** Coordinates GitHub Search API request pacing across Worker isolates. */
export class GitHubSearchRateLimiter extends DurableObject {
  /** Reserves the next request time in this Durable Object's quota bucket.
   * @param intervalMs - Minimum spacing between requests in this bucket.
   * @returns The delay before this reservation can issue its request.
   */
  async reserveSlot(intervalMs: number): Promise<number> {
    return await this.ctx.storage.transaction(async (transaction) => {
      const now = Date.now();
      const nextAllowedAt = await transaction.get<number>("nextAllowedAt");

      const reservation = reserveSearchRequestSlot(
        now,
        nextAllowedAt,
        intervalMs
      );

      await transaction.put("nextAllowedAt", reservation.nextAllowedAt);

      return reservation.delayMs;
    });
  }
}
