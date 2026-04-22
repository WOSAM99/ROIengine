-- Drop saved column-mapping feature.
-- Rationale: mappings were written at import time but never read again after status=READY.
-- The synonym dictionary in lib/parse/synonyms.ts already auto-maps most real-world headers,
-- so saved mappings + the wizard "Confirm" step add UX drag without pulling their weight.

-- Drop the ColumnMapping table entirely.
DROP TABLE IF EXISTS "ColumnMapping";

-- Drop the orphaned FK column on Upload (never read from application code).
ALTER TABLE "Upload" DROP COLUMN IF EXISTS "mappingId";

-- Add per-company default target margin. NULL = use 30% hardcoded fallback.
-- Per-upload `Upload.targetMargin` can override this at import time.
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "defaultTargetMargin" DECIMAL(5, 4);
