# Session Notes - 2026-07-18

## Summary

Decided to **leave GSD** for the remainder of this product line. Brownfield base will be recreated from tag **`extraction_done`** (`ea90d9e`) in a **fresh folder**, then [intent-driven-template-cursor](https://github.com/sldev2/intent-driven-template-cursor) installed via **brownfield INSTALL.md**. First product work after that: **narrow sync/timing** OpenSpec change(s); Resend Phases 1–3 later.

Preserved GSD research value as GSD-free docs (do not need `.planning/` anymore). PAUL notes intentionally not carried forward.

**Runbook:** [`docs/migrate to intent-driven-template-cursor.md`](../migrate%20to%20intent-driven-template-cursor.md)

---

## Recommendations locked

| Topic | Choice |
|-------|--------|
| Export GSD research | **Now** (on source tree), then copy into new folder |
| New project shape | Fresh folder from `extraction_done` |
| First work | Sync / timing (narrow OpenSpec) |
| Doc GSD mentions | Light rewrite — drop command names, keep content |
| Template | Follow template INSTALL.md (brownfield) |
| PAUL | Not for this product path |

---

## Carry-forward docs (copy into new tree)

| File | Purpose |
|------|---------|
| `docs/migrate to intent-driven-template-cursor.md` | Full TODO runbook (human/ai/both) |
| `docs/RESEND-MILESTONE-A.md` | Phases 1–3 checklists |
| `docs/RESEND-DOMAIN-AND-PITFALLS.md` | Domain/`From`/DKIM decision + pitfalls |
| `docs/SYNC-REENGINEERING-POINTERS.md` | Sync surface without GSD process |
| `docs/PRD for Resend use.md` | Already at extraction tag — keep |

---

## Open decisions (not blocking new folder)

- Resend **Option A vs B** (root From vs `send.` From) — resolve before Resend Phase 1 SMTP flip; documented in `RESEND-DOMAIN-AND-PITFALLS.md`.
- Which **single** sync slice is OpenSpec Change #1 (multi-tab auth vs offline timestamps vs AutoPause vs Realtime drift).

---

## Explicitly not needed in new tree

- `.planning/`  
- GSD-injected `.cursor/rules`  
- PAUL discussion docs (`discussions/07_04*`)  
- Reliance on `SESSION_NOTES_2026-07-11.md` (this note supersedes it for handoff)

---

## Related

- Extraction close: `SESSION_NOTES_2026-06-17.md` / `06-16`  
- Canonical product PRD: `docs/REARCHITECT/PRD for NUXT.md`  
- Brownfield SDD guide: `docs/REARCHITECT/SDD_BROWNFIELD_MIGRATION_GUIDE.md`
