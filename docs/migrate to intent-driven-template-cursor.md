# Migrate to intent-driven-template-cursor

**Created:** 2026-07-18  
**Purpose:** Runbook for leaving GSD behind, establishing a clean brownfield base from `extraction_done` (`ea90d9e`), installing [intent-driven-template-cursor](https://github.com/sldev2/intent-driven-template-cursor) (brownfield path), then continuing development with OpenSpec / intent-driven workflows.

**Audience:** Human + AI agent in the **new** working directory. Both parties should read this file first, then work the checklist in order. Tick boxes as you go.

**Checkbox legend:**
- `(human only)` — you do this (git/clone, dashboards, decisions, copy files between folders)
- `(ai only)` — agent can do this from the working tree without you
- `(both)` — agent drafts / executes; you review, confirm, or supply secrets/decisions

---

## Decisions locked (2026-07-18)

| Topic | Decision |
|-------|----------|
| **GSD export timing** | **Option A — export on the old/current branch first**, then carry distill docs into the new tree. Do not rely on digging into `.planning/` from another commit after `.planning/` is gone. |
| **Base project shape** | **Fresh folder** checked out / archived from tag `extraction_done` (`ea90d9e`), not a long-lived branch of the GSD-polluted `HEAD`. |
| **First product work after install** | **Sync / timing re-engineering** — one **narrow** OpenSpec change first (not a full reverse-engineered sync PRD). |
| **Second product track** | Resend Phases 1–3 — from `docs/PRD for Resend use.md` + GSD-free distill docs (already exported). |
| **Template install** | Follow [INSTALL.md](https://github.com/sldev2/intent-driven-template-cursor/blob/main/INSTALL.md) for the **brownfield Project** branch / path. |
| **Historical GSD wording** | Light rewrite: drop GSD **command names** and `.planning/` process language; keep technical content. |
| **What not to carry** | Do not carry PAUL notes (`discussions/07_04*`), raw `.planning/`, or `.cursor/rules` GSD injection. Session value is preserved in a new handoff note (see §0). |

### Why Option A (export now) is recommended

`.planning/` only exists on commits **after** `ea90d9e` (GSD bootstrap: `1142a62` … `c3376f9`). If you open a fresh folder at `extraction_done` first and *then* try to recover research, the agent must either (a) open a second clone of the old tree, or (b) `git show` paths from another commit — easy to miss files, lose nuance, or accidentally reintroduce GSD artifacts.

Exporting **while `.planning/` is still on disk** produces GSD-free markdown under `docs/` that you simply **copy** into the new folder. After that, `.planning/` can be abandoned forever.

**Already done on the source repo (this branch) as part of writing this runbook:**
- `docs/RESEND-MILESTONE-A.md` — checkable Phases 1–3 requirements + success criteria
- `docs/RESEND-DOMAIN-AND-PITFALLS.md` — domain/`From`/DKIM decision + critical pitfalls
- `docs/SYNC-REENGINEERING-POINTERS.md` — sync surface without GSD command language
- `docs/historical/session-notes/SESSION_NOTES_2026-07-18.md` — handoff note (replaces relying on `SESSION_NOTES_2026-07-11.md`)

If those four files are missing in the **new** tree, copy them from the old tree before deleting anything (see §1).

### Why a fresh folder is recommended

Current `HEAD` also contains PAUL, OpenSpec/intent scaffold (`0b1c174`), and GSD `.planning/` + `.cursor/rules`. Surgically deleting those from `HEAD` is error-prone. A fresh folder at `extraction_done` starts with extraction-complete app code + docs, **without** those overlays. You then:

1. Copy this runbook + distill docs into it  
2. Install the Cursor intent-driven template fresh (brownfield INSTALL)  
3. Develop forward with one system of record (OpenSpec), not two

---

## Map of workstreams (after migration)

```text
§0–§2  Export distill (source repo) → create fresh folder → copy carry-ins
§3     Light doc rewrite (drop GSD command names)
§4     Install intent-driven-template-cursor (brownfield)
§5     Verify brownfield base (app still runs)
§6     First OpenSpec change: narrow sync/timing slice
§7     Later: Resend Phases 1–3 (OpenSpec, seeded from PRD + distill)
§8     Explicit non-goals / do-not-bring-back list
```

---

## §0 — Source-repo export (do before abandoning old tree)

Work in the **current / historical** repo that still has `.planning/` (or copy the already-written distill files if present).

- [x] `(human only)` Confirm you are on a commit that still has `.planning/` **or** that the four distill files under `docs/` already exist (see list above). Prefer verifying files exist rather than re-deriving from memory.
- [x] `(human only)` Confirm distill files are present and readable:
  - `docs/migrate to intent-driven-template-cursor.md` (this file)
  - `docs/RESEND-MILESTONE-A.md`
  - `docs/RESEND-DOMAIN-AND-PITFALLS.md`
  - `docs/SYNC-REENGINEERING-POINTERS.md`
  - `docs/historical/session-notes/SESSION_NOTES_2026-07-18.md`
- [N/A] `(ai only)` If any distill file is missing: regenerate from `.planning/REQUIREMENTS.md`, `.planning/ROADMAP.md`, `.planning/research/SUMMARY.md` + `PITFALLS.md`, and `docs/PRD for Resend use.md` — **GSD-free** (no `.planning` paths as process, no slash-commands for GSD).
- [x] `(both)` Confirm `docs/RESEND-DOMAIN-AND-PITFALLS.md` records the Resend sender decision: **Option A** — verify root `myfocusrewards.com`, send From `support@myfocusrewards.com`. Do **not** configure Supabase Auth Custom SMTP with Resend until the Gmail + Outlook header check passes (or you consciously accept that risk).
- [x] `(human only)` Optional: commit these distill/migrate docs on the old tree so they are not only sitting in a dirty working copy — or keep them as loose files to copy. Either way, treat them as **carry-in cargo** for §1.

### §0 detail — What “export useful GSD research” means (do not skip)

The GSD bootstrap did not invent Resend; it wrapped `docs/PRD for Resend use.md` and added research that is easy to lose if you only keep the PRD.

**Already preserved; copy these files into the new tree:**

The useful GSD research has already been distilled into normal docs. During §1, copy the files below into the fresh `extraction_done` tree using the same relative paths. There is nothing else to extract from `.planning/` unless one of these files is missing.

1. `docs/RESEND-MILESTONE-A.md` — checkable Phase 1–3 requirements (SMTP-01…06, RVER-01…03, RAPI-01…05) and success criteria.
2. `docs/RESEND-DOMAIN-AND-PITFALLS.md` — domain / DKIM / From alignment, Option A sender decision, and Resend pitfalls.
3. `docs/SYNC-REENGINEERING-POINTERS.md` — sync pointers without prescribing GSD milestones.
4. `docs/migrate to intent-driven-template-cursor.md` — this runbook.
5. `docs/historical/session-notes/SESSION_NOTES_2026-07-19.md` — latest handoff note only; older session notes are background, not required carry-in.

Key Resend details now live in those docs: Resend “Verified” is not the same as DNS-present; Channel A = Supabase Auth Custom SMTP; Channel B = Resend HTTP API; Phase 2 resend-verification still uses Channel A (`supabase.auth.resend`); Site URL must use port **4000** locally; SMTP username is literal `resend`; Supabase custom SMTP does not auto-raise `rate_limit_email_sent`; resend-verification must be enumeration-safe and IP-rate-limited; the Resend API key stays server-only; missing keys should fail gracefully where documented.

**Safe to abandon:**
- `.planning/config.json`, `STATE.md`, workflow agent settings  
- `.cursor/rules` GSD HTML comment blocks (`<!-- gsd-project-start -->`, etc.)  
- GSD slash-command recipes (`/gsd-plan-phase`, `/gsd-execute-phase`, …)  
- PAUL discussion docs and any desire to dual-track PAUL + OpenSpec on this product  

---

## §1 — Create the fresh brownfield folder from `extraction_done`

- [ ] `(human only)` Create a **new empty directory** outside the old working tree (e.g. sibling folder). Do not reuse the old folder as “cleaned HEAD” unless you fully understand you must delete `.planning/`, PAUL, and late OpenSpec commits.
- [ ] `(human only)` Populate it from tag **`extraction_done`** / commit **`ea90d9e`**. Acceptable methods (pick one):
  - `git clone <repo-url> <new-dir>` then `git checkout extraction_done` (or `ea90d9e`), **or**
  - `git archive ea90d9e | tar -x -C <new-dir>` (no `.git` — then `git init` if you want a new history), **or**
  - New GitHub repo seeded from that tree  
  Record which method you used in `SESSION_NOTES` or a one-line note at the bottom of this file.
- [ ] `(human only)` Confirm the new tree has **no** `.planning/` directory and **no** `.cursor/rules` file whose body is the GSD injection (at `ea90d` these should be absent).
- [ ] `(human only)` Confirm the new tree **does** include:
  - `docs/PRD for Resend use.md`
  - `docs/ENV-SETUP.md`
  - `docs/06_16 TODO (HIGH LEVEL).md` (will be light-rewritten in §3)
  - App sources, `supabase/`, Playwright, etc.
- [ ] `(human only)` Copy **into** the new tree (same relative paths):
  - `docs/migrate to intent-driven-template-cursor.md`
  - `docs/RESEND-MILESTONE-A.md`
  - `docs/RESEND-DOMAIN-AND-PITFALLS.md`
  - `docs/SYNC-REENGINEERING-POINTERS.md`
  - `docs/historical/session-notes/SESSION_NOTES_2026-07-19.md`
- [ ] `(human only)` Copy local secrets carefully: recreate `.env` from your spreadsheet / old machine `.env` — **never commit** `.env`. Use `.env.example` as the name list.
- [ ] `(human only)` Open the **new** folder as the Cursor workspace for all remaining sections. Tell the agent: *“Read `docs/migrate to intent-driven-template-cursor.md` and continue from the first unchecked item.”*

---

## §2 — Baseline commit in the new tree (before template install)

- [ ] `(both)` `npm install` at repo root; confirm no surprising errors.
- [ ] `(human only)` Optional smoke: `npm run dev` loads; you do not need full UAT yet (extraction already closed at this tag).
- [ ] `(both)` Commit carry-in docs only, e.g.  
  `docs: add intent-driven migration runbook and Resend/sync distill`  
  Keep this commit **before** template install so install diffs stay reviewable.

---

## §3 — Light rewrite: drop GSD command names, keep content

At `ea90d`, several docs still say “GSD Milestone A/B” and list `/gsd-*` commands. Rewrite lightly — do **not** delete historical session notes wholesale.

Priority files:

| File | Intent |
|------|--------|
| `docs/06_16 TODO (HIGH LEVEL).md` | Prefer pointing readers to `docs/SYNC-REENGINEERING-POINTERS.md`; or rewrite in place to remove GSD slash-commands |
| `discussions/05_27 dev directions advice.md` | Replace “run `/gsd-…`” with “use OpenSpec / intent-driven change workflow” where it is instructional |
| `discussions/05_28 extraction and dev directions.md` | Keep Layer 0 done / Layer 1 Resend / Layer 2 sync **as program order notes**, but remove GSD tooling recipes (program order for *this* migration is sync-first OpenSpec, then Resend) |
| `docs/06_17 TODO (HIGH LEVEL).md` | If present in new tree: mark superseded by this migrate doc + Resend distill; or delete after note |

- [ ] `(ai only)` Produce patched versions of the priority files (or a short “superseded by …” banner at the top of each).
- [ ] `(human only)` Approve the rewrites (especially any change to program order: sync first vs Resend first).
- [ ] `(both)` Commit: `docs: remove GSD process language from program notes`

**Note:** Historical `SESSION_NOTES_*` may still mention GSD. That is fine as archive. Do not scrub every historical file unless you want a pristine docs tree.

---

## §4 — Install intent-driven-template-cursor (brownfield)

**Source of truth:** [INSTALL.md](https://github.com/sldev2/intent-driven-template-cursor/blob/main/INSTALL.md) — use the instructions for the **brownfield Project** branch / section. If the default branch’s INSTALL.md points you to another branch (e.g. a brownfield branch), check out / follow **that** path.

- [ ] `(human only)` Open INSTALL.md in the browser; skim brownfield prerequisites (Node version, Cursor, what will be written into the repo).
- [ ] `(human only)` Ensure git status is clean (or only intentional uncommitted work) before install.
- [ ] `(both)` Run the brownfield install steps **exactly** as INSTALL.md specifies (clone template, run installer script, copy overlay, etc. — whatever the file says that day). Prefer the template’s documented method over improvising.
- [ ] `(both)` After install, verify expected artifacts exist (typical for intent-driven OpenSpec setups — confirm against INSTALL.md’s checklist):
  - `openspec/` (or equivalent) with intent-driven schema / config  
  - Cursor rules/skills/commands as documented  
  - `AGENTS.md` or project instruction file updated without wiping your Nuxt app  
- [ ] `(ai only)` Confirm install did **not** wipe `app/`, `server/`, `supabase/`, or your distill docs under `docs/`.
- [ ] `(both)` Read `docs/REARCHITECT/SDD_BROWNFIELD_MIGRATION_GUIDE.md` (if present in tree) and align agent behavior with “incremental focused specs, not full reverse-engineering.”
- [ ] `(both)` Commit install result, e.g. `chore: install intent-driven-template-cursor (brownfield)`

**Do not** re-install the old `0b1c174` OpenSpec scaffold from the abandoned HEAD unless INSTALL.md says it is identical. Prefer a clean template install.

---

## §5 — Post-install sanity

- [ ] `(both)` `npm install` / `npm run build` (or project’s usual check) still works.
- [ ] `(ai only)` Grep the new tree for accidental GSD process leftovers that would confuse agents (`/gsd-plan-phase`, `.planning/`, `gsd-project-start`). Historical mentions in old session notes are OK; **live** instruction files (`.cursor/rules`, `AGENTS.md`) must not instruct GSD workflows.
- [ ] `(human only)` Restart Cursor / new chat in the **new** workspace so template skills/commands load.
- [ ] `(both)` Update the “Progress log” at the bottom of this file with date + what completed.

---

## §6 — First product change: narrow sync / timing (OpenSpec)

**Do not** write a full sync PRD before exploring. Follow brownfield SDD: explore the painful slice, then proposal → specs → design → ADR → tasks → apply.

### §6.1 Pick one narrow slice

Candidates (pick **one** for the first change):

| Candidate | Why it hurts | Starting docs / tests |
|-----------|--------------|------------------------|
| Multi-tab / Supabase auth lock / refresh | Tabs hang after WiFi drop | `docs/multi tab problems*.md`, `supabase-no-lock.client.ts` |
| Offline queue authority / lost offline time | Replay uses server `NOW()` | `discussions/lost offline time.md`, `_FORLATER.md` |
| AutoPause replay consistency | Cumulative thresholds offline | Canonical PRD §6.3, Playwright auto-pause specs |
| Cross-tab Realtime timer drift | Core product value | `Playwright/multi-tab-sync.spec.ts`, Manual Testing Plan §15–16 |

- [ ] `(both)` Agree which **single** candidate is Change #1; write it under Progress log.
- [ ] `(human only)` Confirm out of scope for Change #1: Resend, Stripe, rewards redesign, auth replacement.

### §6.2 OpenSpec the change

- [ ] `(both)` Follow the template’s explore / propose / continue / apply / verify commands (names per installed template — e.g. opsx-* or whatever INSTALL.md registers).
- [ ] `(ai only)` Explore only the code paths needed for the chosen slice (composables, RPCs, middleware). Do not reverse-engineer the whole timer system.
- [ ] `(both)` Author focused specs (Gherkin-style scenarios where the schema requires them) + design + ADR if the schema requires ADR for architectural choices.
- [ ] `(human only)` Approve proposal/specs before apply.
- [ ] `(both)` Implement via the template’s apply workflow; keep commits conventional.
- [ ] `(both)` Verify with the smallest honest check: relevant Playwright spec and/or Manual Testing Plan lines for that slice.
- [ ] `(both)` Archive / close the OpenSpec change per template docs.

### §6.3 After Change #1

- [ ] `(both)` Decide whether the next sync slice is another OpenSpec change, or pause sync and start Resend (§7).
- [ ] `(ai only)` Update `docs/SYNC-REENGINEERING-POINTERS.md` with “done / remaining” for the slice you finished.

---

## §7 — Later: Resend Phases 1–3 (OpenSpec)

Start only when you choose to leave sync for a while (or after a sync MVP). Seed from:

- `docs/PRD for Resend use.md` (canonical FRs)
- `docs/RESEND-MILESTONE-A.md` (checklists)
- `docs/RESEND-DOMAIN-AND-PITFALLS.md` (**read first**)

### §7.1 Human gates (Channel A) — often before or parallel with code

- [ ] `(human only)` Resolve **From / verified-domain** Option A vs B; update `EMAIL_FROM_ADDRESS` / docs to match.
- [ ] `(human only)` Resend dashboard: domain **Verified**.
- [ ] `(human only)` Supabase `time-reward-test`: Custom SMTP → Resend (`smtp.resend.com:587`, user `resend`, password = API key).
- [ ] `(human only)` Site URL + Redirect URLs for local (`localhost:4000`) and `test.myfocusrewards.com` `/confirm`.
- [ ] `(human only)` Raise `rate_limit_email_sent`; prove two signups within minutes.
- [ ] `(both)` Doc updates: `.env.example` `RESEND_SMTP_*` comments; ENV-SETUP as needed.

### §7.2 OpenSpec code tracks

Suggested OpenSpec changes (can be one change with phases, or separate changes):

1. Resend verification API + UI (RVER-*)  
2. `EmailDeliveryService` + runtimeConfig + test send (RAPI-*)  

- [ ] `(both)` Propose/apply/verify using the same intent-driven workflow as §6.
- [ ] `(both)` Tick boxes in `docs/RESEND-MILESTONE-A.md` as acceptance is proven.
- [ ] `(human only)` UAT: confirmation from branded sender visible in Resend logs; resend + 429 behavior.

**Out of scope until product needs them:** PRD Phases 4–5 (queue/dispatcher, forgot-password).

---

## §8 — Explicit non-goals (do not bring back)

- [ ] `(both)` Do **not** recreate `.planning/` or GSD workflow as a second source of truth.
- [ ] `(both)` Do **not** run PAUL (`/paul:*`) on this product tree for the migration path (learning project stays separate).
- [ ] `(both)` Do **not** mix Resend and sync into one OpenSpec change.
- [ ] `(both)` Do **not** reverse-engineer a complete sync specification of the entire codebase up front.
- [ ] `(human only)` Do **not** treat production Supabase/SMTP as a gate for brownfield base or for early sync work.

---

## Reference commits / tags (source history)

| Ref | Meaning |
|-----|---------|
| `ea90d9e` / tag `extraction_done` | Extraction closed; preview auth confirm verified; **base for new folder** |
| `1142a62` … `c3376f9` | GSD Milestone A bootstrap (config → PROJECT → research → requirements → roadmap) — **source of distill only** |
| `55d5065` … `0b1c174` | PAUL / intent-driven docs / OpenSpec scaffold on old HEAD — **do not require** in new tree if template install is fresh |

---

## Carry-in file checklist (copy into new folder)

| Path | Role |
|------|------|
| `docs/migrate to intent-driven-template-cursor.md` | This runbook |
| `docs/RESEND-MILESTONE-A.md` | Resend Phases 1–3 checklist |
| `docs/RESEND-DOMAIN-AND-PITFALLS.md` | Domain/From + pitfalls (critical) |
| `docs/SYNC-REENGINEERING-POINTERS.md` | Sync surface without GSD commands |
| `docs/historical/session-notes/SESSION_NOTES_2026-07-18.md` | Handoff / decisions |
| `docs/PRD for Resend use.md` | Already at `ea90d` — keep |
| `docs/REARCHITECT/SDD_BROWNFIELD_MIGRATION_GUIDE.md` | Already / may exist — keep; aligns with template |

---

## Progress log

| Date | Item | Who | Notes |
|------|------|-----|-------|
| 2026-07-18 | Distill docs + this runbook authored on source branch | ai | Option A export |
| | | | |
| | | | |

*(Append rows as you complete sections in the new working directory.)*

---

## Suggested first prompt in the new Cursor workspace

```text
Read docs/migrate to intent-driven-template-cursor.md end-to-end.
Confirm which checklist items through §2 are done.
Continue from the first unchecked item. Prefer (ai only) / (both) work;
stop and ask me for anything marked (human only).
```
