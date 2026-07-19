# Session Notes - 2026-07-19

## Summary

Continued Resend **domain / From** work on the **source** tree (still pre–fresh-folder cut). Locked **Option A** (verify root `myfocusrewards.com`, From `support@myfocusrewards.com`). Documented how to run the Gmail + Outlook **header** check. Clarified that **`resend.com/emails` is a send log only** — no compose UI; use **Templates → send test** or a one-off API/`curl` to real inboxes. Migration runbook / GSD exit plan unchanged.

Prior handoff: **`SESSION_NOTES_2026-07-18.md`**.

---

## Git state at session end

| Item | Value |
|------|--------|
| **Last commit** | `54eed6a` — migrate runbook + Resend/sync distill |
| **Uncommitted (commit before leaving source tree)** | `.env.example` (EMAIL_FROM_* + RESEND_SMTP comments); `docs/RESEND-DOMAIN-AND-PITFALLS.md` (Option A + §2.1 how-to); possibly `docs/migrate to intent-driven-template-cursor.md` if touched |
| **Do not commit** | `.env` (local secrets; user may have added EMAIL_FROM_* locally) |

---

## Resend Option A — status

| Item | Status |
|------|--------|
| Choose A vs B | **Done — Option A** |
| Resend domain **Verified** (root) | **Done** (human confirmed) |
| Env / PRD alignment for Option A | **Done** — PRD already matched; `.env.example` now documents `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` + SMTP dashboard comments |
| Gmail + Outlook header check (SPF/DKIM/DMARC; Inbox vs Spam) | **Open** — see `docs/RESEND-DOMAIN-AND-PITFALLS.md` §2.1 |

### How to send a test (UI surprise)

- **`/emails`** = history only (“No sent emails yet” until something is sent). Not a compose screen.
- **Send a real check:** Resend **Templates** → create short template → **From** `TimeReward <support@myfocusrewards.com>` → **Send test** to Gmail, then Outlook; **or** `POST https://api.resend.com/emails` with API key.
- Do **not** use only `delivered@resend.dev` for this gate — that simulates events; it is not a consumer-inbox auth check.
- After send: Gmail **Show original** / Outlook message details → `spf=pass`, `dkim=pass`, DMARC as expected; note Inbox vs Spam.
- **Option A SPF watch-out:** root MX is Google Workspace — SPF TXT on `myfocusrewards.com` must **merge** Google + Resend (one SPF record).

### Env reminders

- **`NUXT_SKIP_EMAIL_CONFIRMATION`** — **local-only**; intentionally **absent** from Vercel `test` so preview always uses real confirmation email path.
- **`EMAIL_AUTOMATION_ENABLED`** on Vercel — reserved Phase 4 queue; unrelated to skip-confirm.
- **`EMAIL_FROM_*`** — documented in `.env.example`; still **unused in app code** until Resend Phase 3 wiring. May exist on Vercel already.

---

## Migration plan (unchanged)

| Step | Status |
|------|--------|
| Distill GSD research → `docs/` | Done (`54eed6a` + uncommitted Option A edits) |
| Fresh folder from `extraction_done` (`ea90d9e`) | **Not started** |
| Copy carry-in docs + install intent-driven-template-cursor (brownfield INSTALL.md) | **Not started** |
| First product work: **narrow sync** OpenSpec | After new folder |
| Later: Resend Phases 1–3 | After sync slice(s); Channel A SMTP still needs header check + dashboard SMTP |

**Runbook:** [`docs/migrate to intent-driven-template-cursor.md`](../migrate%20to%20intent-driven-template-cursor.md)

**Carry into new folder (same as 07-18, plus updated pitfalls / .env.example):**

| Path | Role |
|------|------|
| `docs/migrate to intent-driven-template-cursor.md` | Full TODO |
| `docs/RESEND-MILESTONE-A.md` | Phases 1–3 checklists |
| `docs/RESEND-DOMAIN-AND-PITFALLS.md` | Option A + §2.1 header check |
| `docs/SYNC-REENGINEERING-POINTERS.md` | Sync without GSD process |
| `docs/historical/session-notes/SESSION_NOTES_2026-07-19.md` | This handoff |
| `.env.example` | After committing Option A env docs |

---

## Recommended next session

1. **Commit** uncommitted docs/`.env.example` on this source tree (if not done).  
2. Finish **§2.1** Gmail + Outlook header check; tick checkbox in `RESEND-DOMAIN-AND-PITFALLS.md`.  
3. **Or** start migrate runbook §1: create fresh folder from `extraction_done`, copy carry-ins, open new Cursor workspace, read migrate doc.  
4. Do **not** start PAUL on this product path. Do **not** configure Supabase Auth Custom SMTP with Resend until the header check passes (or consciously accept the risk).

---

## Related

- `SESSION_NOTES_2026-07-18.md` — GSD exit / migrate decisions  
- `docs/PRD for Resend use.md`  
- `docs/ENV-SETUP.md` — local-only SKIP flag
