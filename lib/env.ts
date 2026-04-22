import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  ANTHROPIC_API_KEY: z.string().optional().default(""),
  ANTHROPIC_MODEL: z.string().default("claude-sonnet-4-6"),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(`Invalid or missing environment variables: ${fields}`);
  }
  cached = parsed.data;
  return cached;
}

export function getPublicEnv() {
  return {
    supabaseUrl: getEnv().NEXT_PUBLIC_SUPABASE_URL,
    supabasePublishableKey: getEnv().NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}
