# TimeReward Docs

TimeReward is a real-time time-tracking app with rewards, breaks, offline queueing, and Supabase-backed authentication/data sync.

The codebase currently runs on `nuxt ^3.20.2` and is configured with `future.compatibilityVersion: 4`, which means it is a Nuxt 3 app that has opted into many Nuxt 4 behaviors.

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+
- A Supabase project

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Create a local `.env` file at the **repository root** and fill in the required values.
   Start with:
   - `.env.example` (repo root)
   - `./ENV-SETUP.md`

3. Apply the database migrations from:
   - `supabase/migrations/` (repo root)

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open:
   - `http://localhost:4000`

## Important Notes

- Auth callback redirects are configured to use `/confirm`.
- Login and register routes are client-rendered on purpose to avoid slow SSR auth/network behavior while offline.
- Auth email delivery currently depends on the Supabase project configuration. Default/shared Supabase SMTP is suitable for light testing only.

## Test User

If the target Supabase project has seed data applied, a test user may exist:
- Username: `kyrie`
- Password: `@Password1`

Do not assume this account exists in every environment.

## Project Structure

```text
NUXT_TimeReward/
├── app/                  # Pages, layouts, middleware, composables, stores
├── assets/css/           # Tailwind entry CSS
├── docs/                 # Project documentation
├── public/               # Static assets
├── scripts/              # Utility scripts
├── server/               # API routes and server-only logic
├── supabase/migrations/  # Database schema and RPC migrations
├── Playwright/           # Browser test workspace
├── nuxt.config.ts        # Nuxt configuration
└── package.json          # Scripts and dependencies
```

## Recommended Reading

- `./REARCHITECT/PRD for NUXT.md` - canonical standalone PRD for the extracted app
- `./ENV-SETUP.md` - environment variables, Supabase verification checklist, Vercel summary, integrations
- `./EXTRACTION/extraction guide.checklist.md` - short extraction close-out checklist (includes latest automated `npm run build` note)
- `./historical/migration/README.md` - where migration-era rewards docs live (not canonical PRD)
- `./historical/session-notes/README.md` - archived dated session logs (optional reading)
- `./MCP-SUPABASE-SETUP.md` - Supabase MCP and project setup notes
- `./Manual Testing Plan.md` - manual verification flows
- `./release-operations-runbook.md` - release/deploy operational notes
- `./decisions/` - architecture and implementation decisions

## Current documentation notes

- `docs/REARCHITECT/PRD for NUXT.md` is the canonical standalone PRD for this repo.
- `docs/REARCHITECT/historical/PRD for NUXT.extraction-ready.md` and `docs/REARCHITECT/historical/PRD for NUXT.handoff-ready.md` are historical derivative/reference documents and not the primary source of truth.
- Migration-era rewards comparison and Group B plan: `docs/historical/migration/` (see README there).
- Archived session logs: `docs/historical/session-notes/` (may mention legacy PRD filenames; treat `PRD for NUXT.md` as authoritative for new work).

## Standalone Repo Goal

This documentation is intended to describe the standalone `NUXT_TimeReward` repo only. Core setup should be possible using this repository and the Supabase project it targets, without depending on parent-repo materials.
