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
- `pnpm vercel-build` — Vercel build entry: runs `prisma migrate deploy` then `next build` (not used locally)

## Deploy to Vercel

The repo is pre-wired for Vercel. The only manual step is setting environment variables — everything else (Prisma Client generation, migration apply) runs automatically on each deploy.

**How it works:**

- `postinstall` → `prisma generate` — runs after Vercel's `pnpm install` so the Prisma Client is always regenerated against Vercel's cached Linux binary (prevents the classic `PrismaClientInitializationError` at runtime).
- `vercel-build` → `prisma migrate deploy && next build` — Vercel picks up this script automatically. It applies any pending migrations against `DIRECT_URL` (session pooler) before compiling Next.js.

### Prerequisites

- A Supabase project with both connection strings ready:
  - **Transaction pooler** (port `6543`, with `?pgbouncer=true&connection_limit=1`) → `DATABASE_URL`
  - **Session pooler** (port `5432`) → `DIRECT_URL`
- A Vercel account linked to your Git provider (GitHub / GitLab / Bitbucket).
- Your Supabase schema should be up-to-date locally (all migrations committed to `prisma/migrations/`).

### Step 1 — Push the repo to Git

```bash
git push origin main
```

### Step 2 — Import the project on Vercel

1. Vercel dashboard → **Add New… → Project** → select the repo.
2. **Framework Preset**: Next.js (auto-detected).
3. **Install Command**: `pnpm install` (auto-detected).
4. **Build Command**: leave blank — Vercel will call `vercel-build` from `package.json` automatically.
5. **Root Directory**: leave as the repo root.

### Step 3 — Set environment variables

In the Vercel project settings → **Environment Variables**, add the values from `.env.example`:

| Key                                    | Required | Value / Notes                                                                           |
| -------------------------------------- | -------- | --------------------------------------------------------------------------------------- |
| `DATABASE_URL`                         | yes      | Supabase **transaction pooler** (port `6543`) with `?pgbouncer=true&connection_limit=1` |
| `DIRECT_URL`                           | yes      | Supabase **session pooler** (port `5432`) — used by `prisma migrate deploy`             |
| `NEXT_PUBLIC_SUPABASE_URL`             | yes      | Supabase project URL                                                                    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes      | Client-safe Supabase key                                                                |
| `SUPABASE_SERVICE_ROLE_KEY`            | no       | Only needed for server-side Storage / admin ops                                         |
| `ANTHROPIC_API_KEY`                    | no       | AI narration disabled when absent; stats still render                                   |
| `ANTHROPIC_MODEL`                      | no       | Defaults to `claude-sonnet-4-6`                                                         |
| `ANTHROPIC_MODEL_INSIGHTS`             | no       | Defaults to `claude-haiku-4-5-20251001`                                                 |

Apply each to **Production**, **Preview**, and **Development** as appropriate.

> **Pooler port matters.** If `DIRECT_URL` uses the transaction pooler (`6543`) instead of the session pooler (`5432`), `prisma migrate deploy` will hang or fail — the transaction pooler does not support prepared statements or advisory locks.

### Step 4 — Deploy

Click **Deploy**. Vercel will run:

```
pnpm install          # installs deps
→ postinstall         # prisma generate (regenerates Prisma Client)
vercel-build          # prisma migrate deploy && next build
```

Watch the build logs — you should see `Applying migration …` lines from Prisma, followed by the standard Next.js build output.

### Step 5 — Verify the deploy

1. Open the Vercel preview URL → should redirect to `/signin`.
2. Create an account.
3. Upload `V1_Messy_Test_Dataset.xlsx` (included in the repo root) and confirm all four dashboard widgets render.

### Redeploys & ongoing migrations

- Every push to the production branch triggers a fresh deploy; new migrations in `prisma/migrations/` apply automatically via `vercel-build`.
- If a migration fails, the deploy fails and the previous version keeps serving traffic. **Fix forward** with a new migration — never force-push to bypass the failure.
- To seed demo data on a fresh production DB, run `pnpm db:seed` against `DIRECT_URL` from your local machine once, post-first-deploy. Seeding is intentionally **not** wired into `vercel-build`.

### Troubleshooting

- **`PrismaClientInitializationError` at runtime** → Build cache served a stale Prisma Client. Verify `postinstall` ran in the build logs; if not, add a dummy env var change to bust the cache and redeploy.
- **`prisma migrate deploy` hangs or times out** → `DIRECT_URL` is pointing at the transaction pooler (`6543`). Switch it to the session pooler (`5432`).
- **`Error: P1001: Can't reach database server`** → Supabase project is paused (free tier auto-pauses after inactivity). Resume it in the Supabase dashboard and redeploy.

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
