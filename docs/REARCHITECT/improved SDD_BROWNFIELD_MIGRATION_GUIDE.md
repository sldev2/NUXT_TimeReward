# Guide for AI Agents: Spec-Driven Development on Brownfield Projects with the intent-driven-template

**Intended audience**: AI coding agents (OpenCode primarily; also Claude/Fable in Cursor, or similar) assisting a solo founder with an existing SaaS codebase (Nuxt / Vercel / Supabase).
**Purpose**: A durable reference so agents consistently apply best-practice Spec-Driven Development (SDD) to brownfield work — instead of ad-hoc changes or risky full reverse-engineering.
**Primary sources**:

- `intent-driven-template` — https://github.com/intent-driven-dev/intent-driven-template (including `INSTALL_TEMPLATE.md` and the bundled skills in `.opencode/skills/` and `.agents/skills/`)
- Walkthrough: *Spec-Driven Development with OpenSpec and OpenCode* — https://intent-driven.dev/blog/2026/05/10/spec-driven-development-openspec-opencode/
- Follow-up: *SDD with Multi-Model Spec Review and Glossary* — https://intent-driven.dev/blog/2026/06/27/sdd-adversarial-authoring-glossary/
- Hari Krishnan's brownfield SDD video (transcript in `docs/transcript.Spec Driven Development on Brownfield Projects.md`)

**When to use this guide**: Any time the user asks to add a feature, fix a bug, refactor, or "re-engineer" part of an existing project that lacks comprehensive upfront specifications. Read it at the start of a brownfield session and re-reference it for every non-trivial change.

---

## 1. What Makes a Project "Brownfield" in SDD?

A **brownfield project** (in the SDD sense) is any codebase that lacks a trustworthy, source-of-truth specification set that drove its creation — regardless of age or who/what wrote the code.

- Analogy (Michael Feathers, *Working Effectively with Legacy Code*): code without tests = legacy code.
- Parallel: code without specs — even code generated last week by Bolt/Replit/Cursor — is brownfield for SDD purposes, because the original prompts and intent are gone.

**Greenfield** = a project driven by explicit specifications from the start.
**Goal of migration**: incrementally move *high-change* areas toward greenfield (rich, trustworthy specs) while leaving stable/dead code as brownfield. Do **not** attempt a one-time full reverse-engineering of the entire codebase.

---

## 2. Core Principle: Incremental Focused Specs > Full Reverse-Engineering

**Never** reverse-engineer a complete specification set from the whole codebase upfront.

**Why it fails** (demonstrated in the Run Club case study from the video):

- The review burden is high and accuracy is unverifiable — when Hari generated specs for a ~10k-line app and derived tests from them, some tests failed and it was unclear whether the specs or the tests were wrong.
- Reverse-engineered specs are **derivative artifacts**. The code is the true context; deriving specs from it loses information and bakes in plausible-but-wrong assumptions about intent.
- Concretely: a reverse-engineered spec for removing the "Maybe" RSVP option **missed a database check constraint and the need for a data migration**. Starting fresh with an incremental spec against the live codebase surfaced both immediately.

**The better path** (analogous to characterization tests in TDD legacy-code work):

- For **each change** (addition, modification, or removal), author **focused, narrow-scope specifications directly from the current codebase**.
- Treat the codebase (plus schema, migrations, and data) as the immutable source of truth for that change.
- Over time, hot paths accumulate high-quality specs and become effectively greenfield; stable areas stay brownfield at zero cost.
- This is far more economical in time, tokens, and accuracy.

**Agent mantra**: *"Explore the relevant slice of code for this specific change, propose precisely, then implement. Park unrelated cleanup for later."*

---

## 3. The Toolchain: What the Template Actually Provides

The template wires **OpenSpec** (artifact lifecycle), **OpenCode** (agent + skills runtime), and a custom schema into one workflow.

### 3.1 The `intent-driven` schema

OpenSpec schemas control which artifacts a change produces and in what order. The template bundles a local copy of the `intent-driven` schema (`openspec/schemas/intent-driven/`, upstream at intent-driven-dev/openspec-schemas), activated via `openspec/config.yaml`:

```yaml
schema: intent-driven
```

It produces five artifacts, in order:

```text
proposal -> specs -> design -> adr -> tasks
```

| Artifact | Captures |
|----------|----------|
| `proposal` | Why the change matters (business/technical intent) |
| `specs` | Observable behaviour as Gherkin-style scenarios |
| `design` | Implementation approach and trade-offs |
| `adr` | Durable architectural decisions (kept **outside** the change so they persist after archive) |
| `tasks` | Actionable implementation work derived from the above |

The schema is what makes the tools one workflow instead of a pile of parts — it is what tells OpenSpec to ask for an ADR after design, and tasks only after that.

### 3.2 Skills (know where they live and when they fire)

**OpenSpec lifecycle skills** in `.opencode/skills/` (names are self-explanatory):
`openspec-new-change`, `openspec-propose`, `openspec-continue-change`, `openspec-explore`, `openspec-apply-change`, `openspec-verify-change`, `openspec-sync-specs`, `openspec-archive-change`, plus `openspec-bulk-apply-change` (parallel apply in worktrees).

**Quality and authoring skills**:

| Skill | Location | Fires during | Purpose |
|-------|----------|--------------|---------|
| `grill-me` | `.agents/skills/` | **Proposal** (before `proposal.md` is written) | Interrogates the plan one question at a time, walking each branch of the design tree until agent and user share understanding. Pulls open questions out *before* specs are written. |
| `adversarial-authoring` | `.opencode/skills/` | **Proposal** (artifact drafting) | One sub-agent authors, another reviews — ideally **different models** (e.g. Claude writes, GPT reviews). Produces council notes: what was written, what was challenged, how each challenge was resolved. Keep to 2–3 sub-agents; more becomes noise. |
| `gherkin-authoring` | `.agents/skills/` | **Specs** | Drafts observable, domain-language behaviour scenarios. |
| `c4-diagrams` | `.agents/skills/` | **Design** (and Explore, when useful) | System context / container / component / dynamic / deployment diagrams in ASCII or Mermaid — only the levels that answer a real question. Requires assumptions and open questions alongside the diagram; refuses to drift into detailed design until the diagram is approved. Especially valuable on brownfield. |
| `glossary` | `.agents/skills/` | **Design** | Maintains precise domain/technical terms so agents and humans converge on shared language (e.g. "anti-corruption layer", not "translation boundary service"). Terms defined once are reused in every subsequent spec. |
| `architectural-decision-records` | `.agents/skills/` | **ADR** | Drafts ADRs with context, options, decision, consequences (MADR, Nygard, Y-Statement, or custom styles), including supersession chains. |
| `openspec-git-discipline` | `.agents/skills/` | **All lifecycle transitions** | Enforces the git gates in Section 6. |

**Superpowers** (from obra/superpowers, bundled):

- The **brainstorming** skill kicks in automatically during Explore.
- The **worktrees** and **subagents** skills power `openspec-bulk-apply-change` — multiple active changes applied in parallel, each in its own worktree and sub-agent, without stepping on each other.
- Also provides guided practices for planning, debugging, TDD, and verification during implementation.

**Specialist agents** in `.opencode/agent/`: `adversarial-author` (drafts an artifact) and `adversarial-reviewer` (challenges the draft).

### 3.3 Repomix (from the brownfield methodology — not bundled in the template)

Repomix is the context-packing tool used throughout the brownfield video, as both a CLI and an MCP server. It is **not** part of the template, but it is strongly recommended for brownfield Explore work:

- **Why**: it packs *slices* of the codebase (with include/ignore patterns, token optimization, structure preservation) into context, keeping the agent grounded in the real source of truth without blowing the context window.
- **Setup**: `npx -y repomix --mcp` registered as an MCP server in OpenCode (or Cursor/Windsurf/Claude); CLI fallback `repomix --include ... --ignore ...`.
- **Usage pattern**: "Pack only the relevant composables, server RPCs, and Supabase migrations for this change — ignore node_modules, .nuxt, .output."

---

## 4. Installing the Template into an Existing (Brownfield) Project

Follow the template's `INSTALL_TEMPLATE.md` — it is written *for the agent*. In OpenCode:

```text
Read and understand INSTALL_TEMPLATE.md and follow the instructions there.
```

High-level steps (do not blindly copy):

1. Clone a fresh copy of the template repo **outside** the target project (or reuse an existing local clone after checking its branch/status).
2. Inspect the target project first: `README.md`, `AGENTS.md`, `opencode.json`, `openspec/`, `.opencode/`, `.agents/`. Preserve existing user instructions and conventions; never delete/replace without explaining the conflict and getting approval.
3. **Copy only if missing**: `openspec/`, `.opencode/`, `.agents/`, `skills-lock.json`, `opencode.json`.
4. **Merge** (never overwrite): `AGENTS.md` — add the OpenSpec git-discipline instruction while keeping existing content. Touch `README.md` only if the user explicitly wants project docs updated.
5. If any of the copy targets already exist, compare template vs target and ask before restructuring.
6. Never touch product code, package files, application docs, or existing tests unless explicitly asked.
7. Validate: `git status --short`, and if the OpenSpec CLI is available, `openspec schema validate intent-driven`. Summarize exactly what changed.

Note: OpenSpec 1.2 introduced **profiles** — beyond the core profile, enable the `new`, `continue`, `verify`, and any other commands the workflow needs during `openspec init`.

---

## 5. The Per-Change Workflow (Brownfield Edition)

### Phase 0 — Setup (one-time per project)

1. Template installed (Section 4); `openspec/config.yaml` has `schema: intent-driven`.
2. Repomix available (MCP preferred, CLI fallback).
3. Start from a **clean working tree** on `main`.

### Phase 1 — Explore (mandatory for brownfield)

- Start every non-trivial brownfield change in **Explore** (`openspec-explore`). Superpowers' brainstorming supports the back-and-forth automatically.
- Pack only the relevant slice with Repomix — the directories, schema, and migrations this change touches. Never dump the whole repo.
- Learn the *current actual behaviour* (characterization mindset: "what does this code really do here?") — pay special attention to **database constraints, enums, triggers, and RLS policies**; these are exactly what reverse-engineered specs miss.
- Ask clarifying questions and get decisions from the user (e.g. "existing 'Maybe' RSVPs — migrate to 'No'?").
- Produce C4 diagrams where they answer a real question (frontend/backend/DB touchpoints).
- **Park unrelated findings** (duplication, dead code) explicitly for later changes.

### Phase 2 — Proposal

- `openspec-new-change` / `openspec-propose`, then `openspec-continue-change` to advance through artifacts.
- Run **`grill-me` before `proposal.md` is written** — interrogate the plan branch by branch until understanding is shared. Open questions belong in the proposal, not discovered during implementation.
- Use **`adversarial-authoring`** to draft the proposal: one sub-agent authors, another (ideally a different model) reviews. Keep the council notes.
- The proposal must correctly classify the change: pure **addition**, pure **removal**, or a **modification** of an existing capability (most brownfield changes are modifications — this drives migration thinking).
- **Explicitly call out**: data migrations, backfills, check constraints, breaking API changes.

### Phase 3 — Specs, Design, ADR, Tasks (schema-sequenced)

- **Specs**: narrow Gherkin scenarios for observable behaviour of *this change only* (`gherkin-authoring`).
- **Design**: implementation approach and trade-offs; `c4-diagrams` for architecture, **`glossary`** to pin domain terms as they emerge.
- **ADR**: if the design surfaced a durable architectural decision, record it (`architectural-decision-records`). ADRs live **outside** the change directory so they survive archiving.
- **Tasks**: derived last, from the accepted intent + behaviour + design + decisions.
- The user reviews artifacts one by one. Do not proceed to implementation on unreviewed artifacts.

### Phase 4 — Apply, Implement, Verify, Archive

- Respect git discipline (Section 6): proposal merged to `main` **before** `openspec-apply-change`.
- Apply creates the implementation branch/worktree; for multiple approved changes, `openspec-bulk-apply-change` runs them in parallel worktrees with sub-agents.
- Implement tasks referencing the accepted specs/design; use Superpowers' TDD/debugging/verification practices.
- `openspec-verify-change` + relevant tests (characterization + new).
- Merge implementation to `main`, **then** `openspec-archive-change`.
- Post-change: update glossary/ADRs if new terms or decisions emerged; note which module gained greenfield coverage.

---

## 6. Git Discipline (Enforced, Not Optional)

The `openspec-git-discipline` skill enforces a single rule: **every OpenSpec state change must cross `main` before the next lifecycle phase depends on it.**

- The proposal must be on `main` before `apply` starts.
- The implementation must be merged back to `main` before `archive` runs.
- Explicit gates exist around `propose`, `continue`, `apply`, and `archive` — the agent **stops and asks** rather than silently violating the rule.

This is what makes parallel changes in worktrees safe (propose on `main` → apply inside worktrees → merge before archive), and it keeps the spec set authoritative rather than drifting behind the code.

---

## 7. Multi-Model Strategy (Planning Model ≠ Coding Model)

The template is explicitly designed for multi-model workflows, and this pairs well with a cost-tiered setup (e.g. a frontier model for analysis/planning, a cheaper model for implementation):

| Work | Model tier | Why |
|------|------------|-----|
| Explore, grill-me, proposal, design, ADR | **Strong/expensive** (e.g. Fable/Claude) | Highest leverage; errors here multiply downstream. |
| Adversarial **review** of drafts | **A different model** than the author (e.g. GPT reviews Claude's draft, or vice versa) | Different models surface different assumptions and biases; over-specification gets caught before human review. |
| Task implementation, test writing | **Cheaper** (e.g. GPT 5.5) | Tasks are narrow and fully specified by the accepted artifacts; less judgment needed. |
| Verification | Either, guided by `openspec-verify-change` and tests | The specs, not the model, are the referee. |

Configure the author/reviewer sub-agents (`.opencode/agent/adversarial-author`, `adversarial-reviewer`) to use different providers in OpenCode. Keep the council to 2–3 sub-agents.

**Handover principle**: the artifacts *are* the handover. If the cheaper coding model needs context beyond the accepted proposal/specs/design/tasks plus the Repomix slice, the artifacts were not finished — go back, don't compensate with chat context.

---

## 8. Best Practices and Pitfalls

**Do**:

- Keep every spec/proposal narrow and change-focused.
- Go to the source of truth: real code, real schema, real migrations — via Repomix slices, not memory or old docs.
- Explicitly surface data migrations, constraints, backfills, and breaking changes in the proposal.
- Use grill-me + adversarial authoring so the spec arriving at the human needs review, not cleanup.
- Maintain the glossary; one precise term ("idempotent", "anti-corruption layer", "leader tab") beats a paragraph of approximation.
- Let greenfield coverage grow organically in hot paths.
- Park scope creep as future changes.

**Don't**:

- Reverse-engineer the whole app "just in case".
- Generate specs in a vacuum without packing real code into context.
- Skip Explore on brownfield changes.
- Accept AI-generated specs without human review of key edge cases — **especially anything touching data**.
- Mix unrelated refactors into the current change's proposal.
- Violate git gates (propose→main→apply; implement→main→archive).

**Context management**:

- Prefer Repomix with tight include patterns over full-repo dumps.
- For large surfaces, explore one bounded context or module at a time — multiple small Explore sessions beat one giant one.

---

## 9. Long-Term Outcome

Applied consistently:

- High-activity modules become well-specified and pleasant to evolve (greenfield-like), with traceability from intent → behaviour → design → decision → task.
- Stable modules stay untouched until a real change needs them.
- ADRs and the glossary persist as durable project memory across archived changes and across agents/models.
- The project escapes the brownfield trap of "we don't know what this does anymore" — without ever paying for a full reverse-engineering pass.

---

## Appendix A — Project-Specific Notes: NUXT_TimeReward, Timing/Sync Re-engineering (Milestone B)

This appendix grounds the guide in the first major SDD effort for this repo. See `docs/06_16 TODO (HIGH LEVEL).md` for the full pre-existing analysis.

### A.1 The change surface

The re-engineering targets timer state synchronization across reconnects, tabs, and browsers. Known coupled problem areas (all touching `useActivities`, RPCs, and connection lifecycle):

- **Multi-tab + Supabase auth**: `isSingleton: true` hardcoded in `@nuxtjs/supabase`; WiFi drop + second tab can hang until reload. Prior research suggests leader-tab / `BroadcastChannel` patterns (`docs/multi tab problems.perplexity.md` and follow-up).
- **Offline authority**: replay uses server `NOW()`, losing offline time; proposed `client_timestamp` with a drift cap (`docs/_FORLATER.md` §2, `discussions/lost offline time.md`).
- **AutoPause replay** and **real-time sync**: PRD for NUXT §6.3–6.5; partial hardening already exists (idempotent RPCs + timestamp params, migrations 025–028, per §9.2) — partial fixes, not architecture.
- **Existing mitigations** (`supabase-no-lock.client.ts`, singleton guards on `useClockSync`/daily rollover) are workarounds to be understood during Explore, not assumed correct.

### A.2 How this maps to the SDD workflow

- **This is a textbook brownfield modification**: existing behaviour is partially documented (PRD for NUXT §2, §6.3–6.5), partially folklore (session notes, perplexity research), and the real truth is in the code + migrations. **Explore against the code**, use the docs as hypotheses to verify, not as specs.
- **Acceptance envelope already exists**: `Playwright/multi-tab-sync.spec.ts`, `cross-browser-sync.spec.ts`, and Manual Testing Plan §15–16. Treat these as the "after" acceptance target; the extraction §8 baseline is the "before" record. Specs authored for each change should map to these.
- **Slice, don't swallow**: the coupled surface (multi-tab auth, offline queue, AutoPause, Realtime, display clock) is too big for one change. Expect a sequence of OpenSpec changes along natural seams, e.g. multi-tab/client architecture → offline authority model (`client_timestamp`) → AutoPause/server-authoritative intervals — each with its own proposal→tasks cycle, each merged to `main` before the next depends on it.
- **Repomix slices to start from**: `app/composables/` (esp. `useClockSync.ts`, `useActivities`, offline queue), `server/` RPC handlers, `supabase/` migrations (esp. 025–028), relevant Playwright specs.
- **Out of scope** (per `discussions/05_27 dev directions advice.md`): replacing Supabase Auth, username-first login, anything Resend/email. Park these if they surface during Explore.

### A.3 Relationship to the earlier GSD plan

Earlier planning docs assumed Milestone B would run under the GSD framework and called for a `PRD for Sync Re-engineering.md` before planning. Under this SDD approach:

- The **OpenSpec artifacts replace the ad-hoc PRD**: the first Explore + proposal (grilled, adversarially reviewed) serves the role the sync PRD would have played — but grounded in the code rather than written in a vacuum.
- The still-valid insights from the GSD-era docs: sequencing (after Resend Milestone A; extraction §8 baseline recorded first), the one-milestone-many-phases shape (now: many OpenSpec changes), and the acceptance envelope (§A.2).
- Do not mix GSD `.planning/` state with OpenSpec `openspec/` state for this effort; Milestone B runs on OpenSpec/OpenCode.

### A.4 Model assignment for this effort

- **Fable (Cursor)**: brownfield analysis, Explore support, proposal/design review — the "expensive judgment" tier of Section 7.
- **OpenCode + GPT 5.5 (or similar)**: artifact drafting under the schema, task implementation, verification.
- **Adversarial pairing**: configure author/reviewer as different models so the sync-architecture proposals get genuine cross-model challenge — this change is exactly the kind of subtle, constraint-laden design where single-model blind spots are costly.

---

## Appendix B — Quick Reference Prompts

**Start a change**:
> "Follow `docs/improved SDD_BROWNFIELD_MIGRATION_GUIDE.md`. We need to [describe change]. Start in Explore with a Repomix pack of only [relevant slices]. Characterize current behaviour — including DB constraints and migrations — then ask clarifying questions before proposing."

**During Explore**:
> "Pack the minimal relevant slice with Repomix. Summarize what the code actually does today around [area], list any DB constraints/enums/RLS that would affect this change, and produce a C4 component diagram of the affected pieces. Park unrelated issues."

**Proposal quality**:
> "Run grill-me on the plan before writing proposal.md. Then draft the proposal with adversarial-authoring (author and reviewer on different models) and keep the council notes. Classify the change as addition/removal/modification and call out any data migration."

**Before apply**:
> "Confirm the proposal is merged to main. Then apply the change in a worktree per openspec-git-discipline."

**After implementation**:
> "Run openspec-verify-change and the relevant Playwright/manual-plan cases. Confirm implementation is merged to main before archiving. Summarize what greenfield spec coverage this module gained."

---

*End of guide. Keep this document in sync with the intent-driven-template and OpenSpec as they evolve. Last updated: July 2026 (based on template README, INSTALL_TEMPLATE.md, and intent-driven.dev posts of 2026-05-10 and 2026-06-27).*
