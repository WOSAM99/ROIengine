import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const BodySchema = z.object({
  email: z.string().email(),
});

const OK_RESPONSE = NextResponse.json({ ok: true });
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

export async function POST(request: NextRequest) {
  const ip = clientIpFrom(request.headers);
  const limit = rateLimit(`forgot:${ip}`, { windowMs: WINDOW_MS, max: MAX_PER_WINDOW });

  // Always return the same 200 body whether rate-limited, invalid, or valid — no enumeration signal.
  if (!limit.allowed) {
    logger.debug("forgot-password rate-limited", {
      ip_bucket: hashIp(ip),
      retryAfter: limit.retryAfterSeconds,
    });
    const res = NextResponse.json({ ok: true });
    res.headers.set("retry-after", String(limit.retryAfterSeconds));
    return res;
  }

  let parsed;
  try {
    parsed = BodySchema.safeParse(await request.json());
  } catch {
    return OK_RESPONSE;
  }
  if (!parsed.success) return OK_RESPONSE;

  try {
    const env = getEnv();
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
      logger.warn("forgot-password: SUPABASE_SERVICE_ROLE_KEY not set; reset disabled");
      return OK_RESPONSE;
    }
    const admin = createSupabaseAdminClient();
    const origin = request.nextUrl.origin;
    const { error } = await admin.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${origin}/auth/reset-password`,
    });
    if (error) {
      // Never surface to client. Log at debug — don't include the email in structured logs.
      logger.debug("forgot-password: supabase returned error", {
        message: error.message,
        ip_bucket: hashIp(ip),
      });
    }
  } catch (error) {
    logger.error("forgot-password: unexpected error", {
      message: error instanceof Error ? error.message : String(error),
      ip_bucket: hashIp(ip),
    });
  }

  return OK_RESPONSE;
}

function hashIp(ip: string): string {
  // Light obfuscation so logs can distinguish callers without storing raw IPs.
  let hash = 0;
  for (let i = 0; i < ip.length; i += 1) {
    hash = ((hash << 5) - hash + ip.charCodeAt(i)) | 0;
  }
  return hash.toString(36);
}
