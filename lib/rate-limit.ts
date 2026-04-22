/**
 * In-memory sliding-window rate limiter.
 *
 * For MVP only — serverless instances don't share memory, so per-instance
 * limits are best-effort. Swap for Upstash Redis when we add horizontal
 * scaling.
 *
 * Usage:
 *   const { allowed, retryAfterSeconds } = rateLimit(`forgot:${ip}`, { windowMs: 600_000, max: 5 });
 *   if (!allowed) return new Response(..., { headers: { "retry-after": String(retryAfterSeconds) } });
 */

type Bucket = { hits: number[] };

const buckets = new Map<string, Bucket>();

export type RateLimitOptions = {
  windowMs: number;
  max: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };

  // Drop hits outside window
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= opts.max) {
    const oldest = bucket.hits[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + opts.windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSeconds, remaining: 0 };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    retryAfterSeconds: 0,
    remaining: opts.max - bucket.hits.length,
  };
}

export function clientIpFrom(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
