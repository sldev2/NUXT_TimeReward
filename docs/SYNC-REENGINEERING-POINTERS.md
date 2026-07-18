# Sync / timing re-engineering — pointers (GSD-free)

**Exported / rewritten:** 2026-07-18  
**Replaces process language in:** `docs/06_16 TODO (HIGH LEVEL).md` (that file may still exist as historical; prefer this for forward work)  
**Method:** OpenSpec / intent-driven-template-cursor — **incremental** focused changes, not a full reverse-engineered sync PRD up front. See `docs/REARCHITECT/SDD_BROWNFIELD_MIGRATION_GUIDE.md`.

---

## Program position (this migration)

After extraction (`extraction_done`):

1. **First:** narrow sync/timing OpenSpec change(s)  
2. **Later:** Resend Phases 1–3 (`docs/PRD for Resend use.md` + `docs/RESEND-MILESTONE-A.md`)

Do **not** mix Resend and sync in one change. Do **not** replace Supabase Auth as part of sync work.

---

## Why this work exists

Core product value (canonical PRD): keep timer state synchronized across reconnects and multiple browser contexts.

Known pain surface (documentation is scattered; there is **no** dedicated sync PRD yet):

| Area | Pointers | Issue (summary) |
|------|----------|-----------------|
| Multi-tab + Supabase auth | `docs/multi tab problems*.md` | Singleton / lock / refresh hang after network drop |
| Partial mitigations | CHANGELOG; `supabase-no-lock.client.ts`; clock/rollover guards | Not a full architecture |
| Offline time lost | `docs/_FORLATER.md`; `discussions/lost offline time.md` | Replay uses server `NOW()`; `client_timestamp` ideas |
| Clock display | `app/composables/useClockSync.ts` | Display offset ≠ authoritative timer |
| AutoPause / offline / Realtime | Canonical `docs/REARCHITECT/PRD for NUXT.md` §6.3–6.5 | Behavior defined; re-engineering still TBD |
| RPC hardening | Migrations 025–028; PRD §9.2 | Partial (idempotent RPCs + timestamps), not full redesign |
| Manual UAT debt | Manual Testing Plan §15–16 | Many multi-tab / cross-browser cases unchecked |
| E2E harness | `Playwright/multi-tab-sync.spec.ts`, `cross-browser-sync.spec.ts` | Use as characterization / “after” acceptance |
| Background reading only | `docs/best practices.perplexity offline*.md` | Local-first / PowerSync ideas — not decisions |

---

## How to proceed (intent-driven / brownfield)

1. Pick **one** narrow slice (see migrate runbook §6 candidates).  
2. Explore only the relevant code (composables, RPCs, connection lifecycle).  
3. Write OpenSpec proposal → behaviour specs → design → ADR (if needed) → tasks.  
4. Implement and verify against Playwright + the matching Manual Testing Plan lines.  
5. Repeat for the next slice. Over time, hot paths accumulate trustworthy specs.

**Do not** attempt a one-shot full specification of the entire timer/sync subsystem before shipping any fix.

### Optional later doc

If multiple slices reveal a stable target architecture, then write `docs/PRD for Sync Re-engineering.md` (in/out of scope, server-authoritative vs hybrid, tab leader, acceptance matrix). That doc is **optional after learning**, not a gate for Change #1.

---

## Out of scope for sync work

- Resend / email delivery  
- Replacing Supabase Auth or username-first login  
- Group B rewards redesign  
- Production launch env cutover  

---

## Progress (fill in as OpenSpec changes complete)

| Slice | OpenSpec change id / name | Status | Notes |
|-------|---------------------------|--------|-------|
| *(none yet)* | | | |

---

*GSD milestone/command language intentionally omitted. Technical content retained from prior program notes.*
