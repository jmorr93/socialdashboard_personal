# Social Media Analytics Dashboard — Project Plan

## Why This Exists

You're running TikTok and Instagram under the Deinfluence Her brand, with defined content pillars, but no centralized way to track what's working. This dashboard gives you a single place to see which content themes perform best, which hooks retain viewers, how your audience is growing, and how each platform compares — so you can make data-driven decisions about what to create next.

---

## Key Decisions Made

| Decision | Rationale |
|----------|-----------|
| **Metricool API** as primary data source | Direct TikTok/IG APIs have notoriously difficult approval processes. Metricool aggregates both behind one API. Requires upgrading your Metricool plan. |
| **Hook score = avg_watch_time / duration** | 3-second hook rate isn't available from any API. This proxy metric auto-calculates and correlates with hook strength. |
| **Next.js + Supabase + Vercel** | All free tier. Supabase handles auth + database + Row Level Security. Vercel handles hosting + cron jobs. |
| **Manual-first pillar tagging** | Your pillars are subjective. Start manual (~5 sec per video), add AI-assisted tagging later after 30+ labeled examples. |

---

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Database:** Supabase (PostgreSQL) with Row Level Security
- **Charts:** Recharts
- **Icons:** Lucide React
- **Deployment:** Vercel (free tier) + Vercel Cron for automated syncs
- **Auth:** Supabase Auth (email/password)

## Stack Conventions

- **Schema management:** Raw SQL migrations in `supabase/migrations/`. No ORM. New tables get new numbered migration files (e.g. `002_add_csv_imports.sql`).
- **TypeScript types:** Hand-written in `src/lib/types/database.ts`. Clients are currently untyped; pages cast as needed. **Recommended upgrade when Supabase is live:** run `supabase gen types typescript` to auto-generate types, then re-add the `Database` generic to clients. Highest-leverage improvement for development speed — not a blocker, do it when ready.
- **Supabase clients:** `@supabase/ssr` for all user-facing code (browser + server). `@supabase/supabase-js` only in `lib/metricool/sync.ts` for service-role cron jobs. **Do not mix these** — the cron service intentionally uses the base package because it runs outside the request/cookie context and needs the service role key to bypass RLS.
- **Proxy (auth guard):** Next.js 16 renamed `middleware.ts` → `proxy.ts` and the export from `middleware()` → `proxy()`. Same behavior, new name. The file at `src/proxy.ts` intercepts requests and redirects unauthenticated users to `/login`. The session refresh logic it calls lives in `lib/supabase/middleware.ts` (name is a Supabase SSR docs convention, not the Next.js middleware convention).

---

## Data Flow

```
Metricool API
     │
     ▼
Vercel Cron (every 6h for videos, daily for account metrics)
     │
     ▼
/api/sync/videos  &  /api/sync/account
     │
     ▼
Supabase (PostgreSQL)
     │
     ▼
Dashboard UI (Next.js client components)
```

---

## Database Schema

| Table | Purpose |
|-------|---------|
| `platforms` | TikTok & Instagram connections, linked to user |
| `content_pillars` | User-defined content categories with color coding |
| `videos` | All video content with latest metrics snapshot |
| `video_pillar_tags` | Many-to-many: which pillars a video belongs to (manual or AI) |
| `video_metrics_history` | Time-series snapshots — track how a video performs at 1h, 6h, 24h, 48h, 7d after posting |
| `account_metrics_daily` | Daily follower count, reach, impressions, engagement per platform |
| `sync_log` | Audit trail of every data sync (success/fail, count, errors) |

Full SQL migration: `supabase/migrations/001_initial_schema.sql`

---

## Dashboard Pages

### Built (Phase 1-3)

| Page | Route | What It Shows |
|------|-------|---------------|
| **Overview** | `/dashboard` | KPI cards (followers, reach, impressions, engagement) split by TikTok vs Instagram. Follower growth line chart + engagement bar chart. |
| **Top Videos** | `/dashboard/videos` | Searchable, sortable table of all videos. Filter by platform + pillar. Inline pillar tagging. Sort by views, likes, engagement rate, hook score, date. |
| **Content Pillars** | `/dashboard/pillars` | CRUD management — create/edit/delete pillars with name, description, color. |
| **Pillar Performance** | `/dashboard/pillar-performance` | Bar chart (avg views per pillar) + radar chart (engagement vs hook score). Summary cards per pillar. |
| **Growth & Trends** | `/dashboard/growth` | Follower growth, daily reach (area chart), posting frequency (stacked bar). Time range toggle: 7d / 30d / 90d. |
| **Hook Scores** | `/dashboard/hooks` | Leaderboard: videos ranked by avg_watch_time / duration. Horizontal bar chart + detailed table with Strong/Average/Weak ratings. |
| **Video Timeline** | `/dashboard/timeline` | Select any video, see how its views/likes/shares grow over time post-publish. |
| **Cross-Platform** | `/dashboard/compare` | Matches cross-posted content by title similarity. Side-by-side TikTok vs IG comparison with winner highlighting. |
| **Settings** | `/dashboard/settings` | Account info, manual sync trigger, sync history log. |
| **Login / Signup** | `/login`, `/signup` | Supabase email/password auth. |

### Not Yet Built

| Feature | Priority | Notes |
|---------|----------|-------|
| CSV import | High | Bulk import historical data from TikTok/IG/Metricool exports. Fallback if API is down. |
| AI-assisted pillar tagging | Medium | After 30+ manually tagged videos, use Claude/OpenAI to auto-suggest pillar tags on new videos. |
| Best Time to Post analysis | Medium | Analyze post timing vs performance to recommend optimal posting windows. |
| Mobile-responsive layout | Medium | Dashboard is desktop-first currently. Needs responsive sidebar + card layouts. |
| Data export (PDF/CSV) | Low | Download dashboard data or generate reports. |

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout (fonts, metadata)
│   ├── page.tsx                # Redirects to /dashboard
│   ├── login/page.tsx          # Login form
│   ├── signup/page.tsx         # Signup form
│   ├── dashboard/
│   │   ├── layout.tsx          # Sidebar + main content area
│   │   ├── page.tsx            # Overview page
│   │   ├── videos/page.tsx     # Video listing + tagging
│   │   ├── pillars/
│   │   │   ├── page.tsx        # Pillar CRUD
│   │   │   └── actions.ts      # Server actions for pillar mutations
│   │   ├── pillar-performance/page.tsx
│   │   ├── growth/page.tsx
│   │   ├── hooks/page.tsx      # Hook score leaderboard
│   │   ├── timeline/page.tsx
│   │   ├── compare/page.tsx
│   │   └── settings/page.tsx
│   └── api/
│       └── sync/
│           ├── videos/route.ts   # Cron endpoint: sync video data
│           └── account/route.ts  # Cron endpoint: sync account metrics
├── components/
│   ├── sidebar.tsx             # Navigation sidebar
│   ├── stat-card.tsx           # Reusable KPI card
│   └── charts/
│       ├── follower-growth-chart.tsx
│       └── engagement-chart.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── middleware.ts       # Session refresh logic (called by proxy.ts)
│   ├── metricool/
│   │   ├── client.ts           # Metricool API fetch wrapper
│   │   └── sync.ts             # Sync logic (videos + account metrics)
│   └── types/
│       └── database.ts         # TypeScript types for all tables
├── proxy.ts                    # Auth proxy (redirects unauthenticated users)
supabase/
└── migrations/
    └── 001_initial_schema.sql  # Full database schema with RLS policies
vercel.json                     # Cron job configuration
.env.local.example              # Template for environment variables
```

---

## Setup Steps (To Get Running)

### 1. Supabase
- Create a project at https://supabase.com
- Go to SQL Editor, paste and run `supabase/migrations/001_initial_schema.sql`
- Go to Settings > API and copy your **Project URL** and **anon public key**
- Go to Settings > API and copy the **service_role key** (for cron syncs)

### 2. Metricool
- Upgrade your Metricool plan to one with API access
- Get your API key from Metricool settings

### 3. Environment Variables
Create `.env.local` in the project root:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
METRICOOL_API_KEY=your-metricool-api-key
CRON_SECRET=any-random-string-for-protecting-cron-endpoints
```

### 4. Run Locally
```bash
cd social-dashboard
npm install   # already done
npm run dev   # starts at http://localhost:3000
```

### 5. Deploy to Vercel
- Push to GitHub
- Import in Vercel, add the same env vars
- Cron jobs auto-configure from `vercel.json`

---

## What Needs Attention Before Going Live

1. **Metricool API endpoints** — The API client (`src/lib/metricool/client.ts`) uses placeholder endpoint paths (`/tiktok/posts`, `/instagram/posts`, etc.). Once you have API access, we need to update these to match Metricool's actual API documentation.

2. **Metricool data mapping** — The response shape from Metricool may differ from what's in `MetricoolVideo` and `MetricoolAccountMetrics` interfaces. We'll need to adjust the mapping once we see real API responses.

3. **CSV import** — Not built yet. This is the fallback for loading historical data and for times when the API is unavailable.

4. **Demo data on Overview** — The Overview page currently shows hardcoded demo numbers. Once Supabase is connected, we need to wire it to real queries.

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Metricool API doesn't expose certain metrics (e.g. avg watch time) | CSV import as supplement. Can add direct platform APIs later. |
| Metricool API rate limits | 6-hour sync cadence is conservative. Exponential backoff built into sync service. |
| Metricool changes pricing or API | Data ingestion is abstracted behind a provider interface — swapping sources means changing one file. |
| API key expires or auth issues | Sync log tracks every run. Settings page shows recent sync history with error messages. |
