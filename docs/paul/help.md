**PAUL Command Reference**

**PAUL (Plan-Apply-Unify Loop)** is a structured AI-assisted development framework for Claude Code.

### The Loop
Every unit of work follows this cycle:

```
┌─────────────────────────────────────┐
│ PLAN ──▶ APPLY ──▶ UNIFY           │
│                                     │
│ Define     Execute     Reconcile    │
│ work     tasks &     close          │
└─────────────────────────────────────┘
```

**Never skip UNIFY.** Every plan needs a summary.

### Quick Start
1. `/paul:init` - Initialize PAUL in your project  
2. `/paul:plan` - Create a plan for your work  
3. `/paul:apply` - Execute the approved plan  
4. `/paul:unify` - Close the loop with summary  

### Commands Overview

| Category          | Commands                                      |
|-------------------|-----------------------------------------------|
| **Core Loop**     | init, plan, apply, unify, help, status       |
| **Session**       | pause, resume, progress, handoff              |
| **Roadmap**       | add-phase, remove-phase                       |
| **Milestone**     | milestone, complete-milestone, discuss-milestone |
| **Pre-Planning**  | discuss, assumptions, discover, consider-issues |
| **Research**      | research, research-phase                      |
| **Specialized**   | flows, config, map-codebase                   |
| **Quality**       | verify, plan-fix, audit                       |

---

### Core Loop Commands

#### `/paul:init`
Initialize PAUL in a project.  
- Creates `.paul/` directory structure  
- Creates `PROJECT.md`, `STATE.md`, `ROADMAP.md`  
- Prompts for project context and phases  
- Optionally configures integrations (SonarQube, etc.)  

**Usage:** `/paul:init`

#### `/paul:plan [phase]`
Enter PLAN phase — create an executable plan.  
- Reads current state from `STATE.md`  
- Creates `PLAN.md` with tasks, acceptance criteria, boundaries  
- Populates skills section from `SPECIAL-FLOWS.md` (if configured)  
- Updates loop position  

**Usage:** `/paul:plan` (auto-detects next phase)  
**Usage:** `/paul:plan 3` (specific phase)

#### `/paul:apply [plan-path]`
Execute an approved `PLAN.md` file.  
- Blocks if required skills not loaded  
- Validates plan exists and hasn't been executed  
- Executes tasks sequentially  
- Handles checkpoints (decision, human-verify, human-action)  
- Reports completion and prompts for UNIFY  

**Usage:** `/paul:apply`  
**Usage:** `/paul:apply .paul/phases/01-foundation/01-01-PLAN.md`

#### `/paul:unify [plan-path]`
Reconcile plan vs actual and close the loop.  
- Creates `SUMMARY.md` documenting what was built  
- Audits skill invocations (if configured)  
- Records decisions made, deferred issues  
- Updates `STATE.md` with loop closure  
- **Required** — never skip this step  

**Usage:** `/paul:unify`

#### `/paul:help`
Show this command reference.  

**Usage:** `/paul:help`

#### `/paul:status` *(deprecated)*
Use `/paul:progress` instead.

---

### Session Commands

#### `/paul:pause [reason]`
Create handoff file and prepare for session break.  
- Creates `HANDOFF.md` with complete context  
- Updates `STATE.md` session continuity section  

**Usage:** `/paul:pause "switching to other project"`

#### `/paul:resume [handoff-path]`
Restore context from handoff and continue work.  
- Reads `STATE.md` and any HANDOFF files  
- Determines current loop position  
- Suggests exactly **one** next action  

**Usage:** `/paul:resume`

#### `/paul:progress [context]`
Smart status with routing — suggests **one** next action.  
- Shows milestone and phase progress visually  
- Displays current loop position  
- Warns about context limits  

**Usage:** `/paul:progress "I only have 30 minutes"`

#### `/paul:handoff [context]`
Generate comprehensive session handoff document.  

**Usage:** `/paul:handoff "phase10-audit"`

---

### Roadmap Commands

- **`/paul:add-phase <description>`** — Append a new phase to the roadmap.  
- **`/paul:remove-phase <number>`** — Remove a future (not started) phase.

---

### Milestone Commands

- **`/paul:milestone <name>`** — Create a new milestone with phases.  
- **`/paul:complete-milestone [version]`** — Archive milestone and reorganize roadmap.  
- **`/paul:discuss-milestone`** — Explore vision before starting a milestone.

---

### Pre-Planning Commands

- **`/paul:discuss <phase>`** — Articulate vision before planning.  
- **`/paul:assumptions <phase>`** — Surface Claude’s assumptions.  
- **`/paul:discover <topic>`** — Lightweight research of codebase patterns.  
- **`/paul:consider-issues`** — Review and triage deferred issues.

---

### Research Commands

- **`/paul:research <topic>`** — Deploy research agents for external info.  
- **`/paul:research-phase <number>`** — Research unknowns for a specific phase.

---

### Specialized Commands

- **`/paul:flows`** — Configure specialized workflow integrations.  
- **`/paul:config`** — View or modify PAUL configuration.  
- **`/paul:map-codebase`** — Generate structured codebase map.

---

### Quality Commands

- **`/paul:verify`** — Guide manual user acceptance testing.  
- **`/paul:audit [plan-path]`** — Run enterprise-grade architectural audit.  
- **`/paul:plan-fix`** — Plan fixes for UAT issues.

---

### Files & Structure

```
.paul/
├── PROJECT.md
├── ROADMAP.md
├── STATE.md
├── config.md
├── SPECIAL-FLOWS.md
├── MILESTONES.md
└── phases/
    ├── 01-foundation/
    │   ├── 01-01-PLAN.md
    │   ├── 01-01-AUDIT.md (optional)
    │   └── 01-01-SUMMARY.md
    └── 02-features/
        ├── 02-01-PLAN.md
        └── ...
```

### PLAN.md Structure
```markdown
---
phase: 01-foundation
plan: 01
plan_type: execute
autonomous: true
---

<objective>
Goal, Purpose, Output
</objective>

<skills>
Required skills from SPECIAL-FLOWS.md
</skills>

<acceptance_criteria>
Given/When/Then format
</acceptance_criteria>

<tasks>
<task type="auto">...</task>
</tasks>

<boundaries>
DO NOT CHANGE, SCOPE LIMITS
</boundaries>

<verification>
Completion checks
</verification>
```

### Task Types

| Type                        | Use For                              |
|-----------------------------|--------------------------------------|
| `auto`                      | Fully autonomous execution           |
| `checkpoint:decision`       | Choices requiring human input        |
| `checkpoint:human-verify`   | Visual/functional verification       |
| `checkpoint:human-action`   | Manual steps (rare)                  |

### Common Workflows
- **Starting a new project**: `init` → `plan` → `apply` → `unify`
- **Enterprise workflow** (with audit): `plan` → `audit` → `apply` → `unify`
- **Checking status**: `/paul:progress`
- **Resuming**: `/paul:resume`
- **Pre-planning**: `discuss` → `assumptions`/`research` → `plan`

### Key Principles
1. Loop must complete — PLAN → APPLY → UNIFY  
2. Commands are thin — logic lives in workflows  
3. State is tracked in `STATE.md`  
4. Boundaries are real  
5. Acceptance criteria first  
6. Skills are enforced at apply time  

### Getting Help
- Run `/paul:progress` to see where you are and the next action  
- Read `.paul/PROJECT.md`, `.paul/STATE.md`, and `.paul/ROADMAP.md`

---

**PAUL Framework v1.4** · Chris AI Systems  
[https://chrisai.cv/skool](https://chrisai.cv/skool) · [https://youtube.com/@chris-ai-systems](https://youtube.com/@chris-ai-systems)  

*23 commands | 14 workflows | 13 templates*