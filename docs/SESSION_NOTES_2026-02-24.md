# Session Notes - 2026-02-24

## Summary

MCP setup and documentation for the Nuxt/Supabase time-reward-test project. No feature work, TODOs, or migration steps were in progress.

## What We Did

### MCP and user discovery

- **Clarified data sources:**  
  - **mcp-time-reward-test** (Supabase URL) → Supabase project `time-reward-test` (used by Nuxt).  
  - **postgres-test** (pg-mcp-server) → DigitalOcean `TimeRewardTest` (AspNetUsers, .NET backend).  
  They are different databases; “kyrie” exists only in Supabase.

- **Allowlist:** Added `mcp__mcp-time-reward-test__*` to `.claude/settings.json` so the AI can use the Supabase MCP tools (e.g. `list_tables`, `execute_sql`). In Cursor the server appears as **user-mcp-time-reward-test**.

- **Users in time-reward-test:**  
  - `public.user_profiles`: 1 user — **kyrie** (KYRIE IRVING, kyrie@timereward.local, subscription active).  
  - **auth.users**: kyrie present with same `id`; auth row created first, then profile.

### Documentation

- **docs/MCP-SUPABASE-SETUP.md:** New section *“Supabase URL-based MCP vs Direct Postgres (pg-mcp-server)”* — when to use the Supabase URL MCP vs a pg-mcp-server + `DATABASE_URL` config, pros/cons, and recommendation (keep URL-based; optionally add direct Postgres for consistency with other DBs).

## No active TODO or migration

This session was **not** in the middle of a specific TODO or migration subset. We only:

- Clarified which MCP points at which DB.
- Listed users in the Supabase project.
- Documented MCP configuration options.

After restarting the chat, you can pick up any feature work, migration, or task list from your normal place (e.g. PRD, CHANGELOG, or task tracker).
