/**
 * Token-Bucket Rate Limiter
 *
 * Configured for 5 requests per minute with a burst allowance of 2 tokens.
 * Uses in-memory LRU storage with automatic cleanup to prevent memory leaks.
 */

export interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

export interface RateLimitResult {
  success: boolean;
  allowed: boolean; // Alias for success
  remaining: number;
  resetMs: number;
  resetSeconds: number;
  limit: number;
}

export const RATE_LIMIT_CONFIG = {
  capacity: 2, // Burst allowance: maximum tokens
  refillIntervalMs: 12000, // 5 requests per 60s = 1 token every 12s (12,000ms)
  maxEntries: 10000, // LRU store maximum entries
  bucketTtlMs: 60 * 60 * 1000, // 1 hour idle TTL for automatic bucket cleanup
} as const;

const buckets = new Map<string, TokenBucket>();
let lastSweepTime = 0;

/**
 * Extracts client IP from request headers.
 * Inspects `x-forwarded-for` (first hop), `x-real-ip`, with fallback to `127.0.0.1`.
 */
export function getClientIp(req: Request | Headers): string {
  const headers = req instanceof Request ? req.headers : req;
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = headers.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  return "127.0.0.1";
}

/**
 * Removes buckets that have been inactive longer than `bucketTtlMs`.
 */
function sweepExpiredBuckets(now: number): void {
  // Only sweep once every 60 seconds to minimize overhead
  if (now - lastSweepTime < 60000) {
    return;
  }
  lastSweepTime = now;

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > RATE_LIMIT_CONFIG.bucketTtlMs) {
      buckets.delete(key);
    }
  }
}

/**
 * Checks and consumes a token from the bucket for the given identifier.
 * Returns rate limit status including remaining tokens and time to next refill.
 */
export function checkRateLimit(
  identifier: string,
  now: number = Date.now()
): RateLimitResult {
  const normalizedKey = identifier.startsWith("ratelimit:")
    ? identifier
    : `ratelimit:debate:${identifier}`;

  // Periodic expiration sweep
  sweepExpiredBuckets(now);

  let bucket = buckets.get(normalizedKey);

  if (!bucket) {
    // Evict oldest entry if capacity limit reached
    if (buckets.size >= RATE_LIMIT_CONFIG.maxEntries) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey) {
        buckets.delete(oldestKey);
      }
    }
    bucket = {
      tokens: RATE_LIMIT_CONFIG.capacity,
      lastRefill: now,
    };
  } else {
    // Re-insert for Map LRU ordering
    buckets.delete(normalizedKey);

    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor(elapsed / RATE_LIMIT_CONFIG.refillIntervalMs);
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(
        RATE_LIMIT_CONFIG.capacity,
        bucket.tokens + tokensToAdd
      );
      bucket.lastRefill += tokensToAdd * RATE_LIMIT_CONFIG.refillIntervalMs;
    }
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(normalizedKey, bucket);

    const timeUntilNextRefill = Math.max(
      0,
      RATE_LIMIT_CONFIG.refillIntervalMs - (now - bucket.lastRefill)
    );
    const resetSeconds = Math.ceil(timeUntilNextRefill / 1000) || 12;

    return {
      success: true,
      allowed: true,
      remaining: bucket.tokens,
      resetMs: timeUntilNextRefill,
      resetSeconds,
      limit: RATE_LIMIT_CONFIG.capacity,
    };
  }

  // Token depleted
  buckets.set(normalizedKey, bucket);

  const waitMs = Math.max(
    1,
    RATE_LIMIT_CONFIG.refillIntervalMs - (now - bucket.lastRefill)
  );
  const resetSeconds = Math.ceil(waitMs / 1000) || 12;

  return {
    success: false,
    allowed: false,
    remaining: 0,
    resetMs: waitMs,
    resetSeconds,
    limit: RATE_LIMIT_CONFIG.capacity,
  };
}

/**
 * Resets the in-memory rate limiter store (useful for test isolation).
 */
export function resetRateLimiter(): void {
  buckets.clear();
  lastSweepTime = 0;
}

/**
 * Returns current bucket count and entries for observability.
 */
export function getRateLimiterStats(): { totalBuckets: number } {
  return {
    totalBuckets: buckets.size,
  };
}
