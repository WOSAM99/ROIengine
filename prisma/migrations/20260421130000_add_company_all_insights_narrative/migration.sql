-- Add AI-generated "All uploads" aggregate narrative cache to Company.
-- Recomputed at upload import (new data) and upload delete (data removed).
-- NULL means: no uploads exist, narration not yet attempted, or last call failed.

ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "allInsightsNarrative" JSONB;
