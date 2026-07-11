# Using PAUL with Cursor Agent for This Project

**Date:** 2026-07-04
**Context:** Considering using PAUL (Claude Code CLI framework) for future development legs of the TimeReward Resend integration, with Cursor agent providing planning/guidance.

---

## Is this viable? Yes, with caveats.

### What would work well

1. Cursor agent creates a step-by-step guide document with specific `/paul:command` calls in order, including what context/arguments to pass each command.
2. You run those commands in a Claude Code terminal window.
3. Claude Code (via PAUL) does the actual execution — planning, coding, unifying.
4. You come back to Cursor agent if you hit issues, want to adjust course, or need the plan updated.

### The caveats to think about

#### 1. GSD vs PAUL overlap

You already have `.planning/` (GSD) with a roadmap, requirements, and research for the Resend milestone. PAUL would create a parallel `.paul/` structure. Two frameworks tracking the same work creates drift risk. Options:

- **Use PAUL only** for the execution legs (ignore GSD's plan/execute/verify workflow; treat `.planning/` as read-only reference material that PAUL's Claude Code session can read for context)
- **Use PAUL as the executor** and Cursor agent maintains the GSD state afterward (update `.planning/STATE.md` etc. when you report back)
- **Pick one framework** and stick with it

#### 2. PAUL needs its own initialization

Before running `/paul:plan`, you'd need `/paul:init` which creates its own project context. That init session needs to know about the existing `.planning/` research, requirements, and roadmap — otherwise Claude Code starts from scratch. The plan would explicitly tell you what context to feed it.

#### 3. Cursor agent guidance vs Claude Code's autonomy

PAUL's `/paul:apply` runs autonomously — Claude Code makes its own decisions during execution. A plan from Cursor can set up the *what* and *boundaries*, but can't control *how* Claude Code implements within a PAUL apply session. The quality depends on how well the PLAN.md is written.

#### 4. Session boundaries

Claude Code has context limits. The PAUL framework handles this via `/paul:pause` and `/paul:resume`, but complex phases may still need to be broken into multiple plans (01-01, 01-02, etc.).

---

## Recommendation

This works best if Cursor agent produces a concrete guide document — something like `docs/paul/resend-execution-guide.md` — that lists each step, the exact command, what context to provide, and what to check before moving to the next step. You'd follow it like a runbook in your Claude Code window.

## Open questions before proceeding

- Are you picking up from Phase 1 of the Resend milestone (the SMTP/dashboard work that's mostly human), or jumping to Phase 2 (the code work)?
- Should PAUL's init reference the existing `.planning/` artifacts, or start fresh with its own project context?
- Any preferences on how PAUL and GSD coexist (or does one win)?

---

## Decision

**Deferred.** Will do a learning project with PAUL first before applying it here.
