-- Add AI-generated Top Insights narrative column to Upload.
-- Populated once at import time; never regenerated (user directive: reload only on new upload).
-- NULL means narration was not computed (missing ANTHROPIC_API_KEY, call failed, or pre-feature upload).

ALTER TABLE "Upload" ADD COLUMN IF NOT EXISTS "insightsNarrative" JSONB;
