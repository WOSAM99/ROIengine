# ROI Dashboard

Next.js 15 App Router + Supabase + Prisma + Anthropic Claude.

Interactive performance dashboard for field-services jobs: upload Excel/CSV, compute deterministic margin/cash-flow/PM metrics, surface profit leaks, and narrate stats with AI.

## Local setup

```bash
# 1. Copy env template and fill in values
cp .env.example .env.local
# Edit .env.local — at minimum, DATABASE_URL, DIRECT_URL, NEXT_PUBLIC_SUPABASE_URL,
# NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Supabase service role and Anthropic key are optional.

# 2. Install deps
pnpm install

# 3. Generate Prisma client + apply migrations
pnpm db:generate
pnpm db:migrate

# 4. (optional) Seed demo data
pnpm db:seed

# 5. Run dev server
pnpm dev
```

Visit http://localhost:3000 — you'll be redirected to `/signin`. Create an account, then upload `V1_Messy_Test_Dataset.xlsx` (in repo root) to verify the full flow.

## Scripts

- `pnpm dev` — local dev with Turbopack
- `pnpm build` — production build
- `pnpm start` — run the production bundle
- `pnpm test` — run Vitest once
- `pnpm test:watch` — Vitest watch mode
- `pnpm lint` — ESLint
- `pnpm format` — Prettier on the whole repo
- `pnpm db:migrate` — run new migrations against the DB
- `pnpm db:studio` — open Prisma Studio
- `pnpm db:seed` — seed demo company + 6 jobs

## Environment

| Key                                    | Required | Purpose                                                           |
| -------------------------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`                         | yes      | Supabase pooled connection (port 6543) with `?pgbouncer=true`     |
| `DIRECT_URL`                           | yes      | Supabase session pooler (port 5432) for Prisma migrations         |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | Supabase project URL                                              |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | Client-safe Supabase key                                          |
| `SUPABASE_SERVICE_ROLE_KEY`            | no       | Only needed for server-side Storage / admin ops                   |
| `ANTHROPIC_API_KEY`                    | no       | AI narration is silently disabled when absent; stats still render |
| `ANTHROPIC_MODEL`                      | no       | Defaults to `claude-sonnet-4-6`                                   |

## Architecture

Upload (CSV/XLSX) → Preview → Column Mapping → Normalization → `Job` table
↓
Deterministic Margin Rules Engine
↓
Dashboard (4 widgets)
↓
AI Chat (predefined Qs → SQL aggregates → AI summary)

Full plan: `AI_DOCS/planning/implementation-plan.md`.

## Safety

- Raw job rows **never** leave the server. AI Chat only receives aggregated statistics.
- `ANTHROPIC_API_KEY` is optional — the UI degrades gracefully when absent.
- All LLM cost approvals live in `AI_DOCS/memory/ai-cost-approvals.md`.
- Database migrations run against the session pooler; runtime queries use the transaction pooler.

## Testing

```bash
pnpm test            # run Vitest once (metrics + parse)
pnpm test:watch      # watch mode
```

Coverage target for `lib/metrics/*` is 100% — arithmetic correctness is the product.
