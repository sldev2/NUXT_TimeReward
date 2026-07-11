# General Guidance: Using PAUL with Cursor Agent for a Greenfield Project (PRD exists)

**Date:** 2026-07-04
**Scenario:** You have a PRD (Product Requirements Document) for a greenfield project. You want to use PAUL (Plan-Apply-Unify Loop, a Claude Code CLI framework) for execution, with a Cursor agent providing high-level planning, guidance, and oversight.

---

## Overview

```
┌──────────────────────────────────────────────────────────┐
│  CURSOR AGENT (IDE)              PAUL / CLAUDE CODE (CLI) │
│                                                           │
│  • Reads PRD                     • Executes code          │
│  • Creates execution guide       • Runs autonomously      │
│  • Tracks progress               • Creates .paul/ state   │
│  • Adjusts plan on feedback      • Handles checkpoints    │
│  • Answers questions             • Commits changes        │
└──────────────────────────────────────────────────────────┘
```

**Division of labor:**
- **Cursor agent** = strategist / planner / reviewer
- **PAUL (Claude Code)** = executor / implementer

---

## Workflow: End to End

### Phase 0: Setup (Cursor agent)

1. **Read and digest the PRD.** Cursor agent reads the PRD file, identifies scope, phases, requirements, constraints.
2. **Produce an execution guide.** A markdown document (e.g. `docs/paul/execution-guide.md`) containing:
   - Ordered steps with exact `/paul:command` calls
   - Context/arguments to pass each command
   - What to verify between steps
   - Decision points where you'll need to make a choice
3. **Optionally: produce a PAUL-ready project brief.** A condensed version of the PRD formatted for PAUL's `/paul:init` prompt — so Claude Code gets the right context from the start.

### Phase 1: Initialize PAUL (you, in Claude Code terminal)

```bash
# Start Claude Code in your project directory
claude

# Initialize PAUL
/paul:init
```

During init, paste or reference the project brief that Cursor agent prepared. PAUL will create:
- `.paul/PROJECT.md` — project context
- `.paul/ROADMAP.md` — phases
- `.paul/STATE.md` — current position

**Tip:** If Cursor agent already identified phases/milestones, tell PAUL about them during init so the roadmap aligns.

### Phase 2: Pre-planning (optional but recommended)

For each phase, before creating a plan:

```
/paul:discuss <phase-number>
```

This lets Claude Code articulate its understanding of the phase. Review the output. If it's off-base, correct it before planning.

```
/paul:assumptions <phase-number>
```

Surfaces what Claude Code assumes. Correct any wrong assumptions before they get baked into a plan.

### Phase 3: Plan (you, in Claude Code terminal)

```
/paul:plan <phase-number>
```

PAUL creates a `PLAN.md` with:
- Objective
- Tasks (auto, checkpoint:decision, checkpoint:human-verify, checkpoint:human-action)
- Acceptance criteria
- Boundaries (scope limits)

**Review the plan before applying.** If it looks wrong, tell Claude Code to revise it (conversationally), or come back to Cursor agent for guidance.

### Phase 4: Apply (you, in Claude Code terminal)

```
/paul:apply
```

PAUL executes the plan autonomously. It will pause at checkpoints for your input. Between phases or if context gets large:

```
/paul:pause "reason"
```

Resume later:

```
/paul:resume
```

### Phase 5: Unify (you, in Claude Code terminal)

**Never skip this.** After apply completes:

```
/paul:unify
```

Creates a `SUMMARY.md` documenting what was built, decisions made, and deferred issues. This closes the loop.

### Phase 6: Review and iterate (Cursor agent)

Come back to Cursor agent to:
- Review what PAUL built
- Update the execution guide for the next phase
- Handle any issues PAUL surfaced but couldn't resolve
- Adjust the overall plan based on what was learned

---

## The Execution Guide Format

The guide Cursor agent produces should look like this:

```markdown
# Execution Guide: [Project Name]

## Prerequisites
- [ ] PRD reviewed and understood
- [ ] Claude Code installed and working
- [ ] Project directory created / cloned

## Step 1: Initialize PAUL
**Command:** `/paul:init`
**Context to provide:** [paste this project brief...]
**Verify before continuing:** .paul/ directory exists with PROJECT.md, ROADMAP.md, STATE.md

## Step 2: Discuss Phase 1
**Command:** `/paul:discuss 1`
**What to check:** Claude Code's understanding matches the PRD's Phase 1 scope
**If wrong:** Correct it conversationally, then re-run

## Step 3: Plan Phase 1
**Command:** `/paul:plan 1`
**Review:** Read the generated PLAN.md — tasks, boundaries, acceptance criteria
**If plan looks good:** Proceed to Step 4
**If plan needs work:** Tell Claude Code what to change

## Step 4: Apply Phase 1
**Command:** `/paul:apply`
**During execution:** Answer checkpoint prompts as they appear
**If context limit hit:** `/paul:pause` then `/paul:resume` in a new session

## Step 5: Unify Phase 1
**Command:** `/paul:unify`
**Verify:** SUMMARY.md created, STATE.md updated

## Step 6: [Repeat for Phase 2...]
```

---

## Key Principles

### 1. Cursor agent owns the strategy, PAUL owns execution

Don't try to micro-manage PAUL's implementation choices from Cursor. Instead:
- Set clear boundaries and acceptance criteria in the plan
- Review the result after unify
- Adjust the next phase's approach based on what you learned

### 2. The PRD is the source of truth

Both Cursor agent and PAUL should reference the same PRD. PAUL's `.paul/PROJECT.md` should be derived from (not replace) the PRD.

### 3. One phase at a time

Don't plan all phases upfront in PAUL. Plan → Apply → Unify one phase, then adjust the next phase based on reality. The execution guide can sketch all phases, but only the immediate next step should be detailed.

### 4. Context is the bottleneck

Claude Code has a context window. For a greenfield project with a PRD:
- Keep plans focused (one concern per plan)
- Use `/paul:pause` and `/paul:resume` liberally
- Don't let a single apply session try to do too much
- If a phase is complex, split it into multiple plans (01-01, 01-02, etc.)

### 5. Checkpoints are your quality gates

Use task types strategically:
- `checkpoint:decision` — when PAUL hits a design fork (e.g. "which pattern for X?")
- `checkpoint:human-verify` — after something is built that needs visual/functional check
- `checkpoint:human-action` — for things Claude Code can't do (dashboard config, DNS, etc.)

### 6. Never skip unify

Even if the phase was trivial. The SUMMARY.md is how PAUL maintains continuity across sessions and how you (or Cursor agent) can review what happened.

---

## When to come back to Cursor agent

- PAUL produced something you're not sure about
- You need to adjust the overall plan/roadmap
- A phase's output doesn't match the PRD intent
- You want a code review of what PAUL built
- You need to update the execution guide for remaining phases
- You hit an issue PAUL can't resolve (e.g. architecture decisions, third-party integration questions)

---

## When NOT to use this pattern

- **Trivial tasks** — just ask Cursor agent directly; PAUL overhead isn't worth it
- **Pure research/exploration** — Cursor agent with web search is better suited
- **Configuration/dashboard work** — no code to execute; just follow a checklist
- **Debugging** — interactive back-and-forth in Cursor is faster than PAUL's loop

---

## Comparison: PAUL vs GSD

If you also have GSD (`.planning/`) set up:

| Concern | GSD | PAUL |
|---------|-----|------|
| Project init / roadmap | `/gsd-new-project` | `/paul:init` |
| Phase planning | `/gsd-plan-phase` | `/paul:plan` |
| Execution | `/gsd-execute-phase` (subagents) | `/paul:apply` (sequential) |
| Verification | `/gsd-verify-work` | `/paul:verify` + `/paul:unify` |
| Session continuity | STATE.md + `/gsd-resume-work` | STATE.md + `/paul:resume` |
| Where it runs | Cursor IDE (or Claude Code) | Claude Code CLI only |

**If using both:** Pick one as the executor. Use the other's artifacts as read-only context. Don't maintain parallel state in both `.planning/` and `.paul/` for the same work.

---

**PAUL Framework v1.4** · Guidance prepared for use with Cursor agent overlay pattern.
