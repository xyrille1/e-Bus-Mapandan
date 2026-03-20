---
name: prd-feature-gate-executor
description: "Execute product requirement documents with strict sequential feature delivery. Use when user asks for PRD ingestion, priority ordering, dependency mapping, feature-by-feature implementation, acceptance criteria, verification gates, and explicit NEXT confirmation before moving on. Triggers: PRD, feature table, gate status, OPEN PLAN BUILD VERIFY GATE, scope creep control, decision log."
argument-hint: "Paste PRD text and any tech constraints to start Phase 0."
user-invocable: true
disable-model-invocation: false
---

# PRD Feature Gate Executor

## Outcome

Turn a PRD into a disciplined, sequential implementation workflow with hard gates between features.

## When to Use

- User wants structured PRD execution from planning through implementation.
- User wants strict one-feature-at-a-time delivery.
- User wants explicit quality gates and acceptance criteria before progression.
- User wants command-driven control such as GO, NEXT, STATUS, REORDER, PAUSE, SPLIT, GAPS, DECISIONS.

## Guardrails

- Process order is mandatory: Phase 0 first, then feature loop.
- No parallel features.
- No feature skipping unless user explicitly asks.
- No auto-start of next feature.
- Max one clarifying question per phase.
- Make explicit assumptions to preserve momentum.

## Phase 0: PRD Ingestion

### Step 1: Extract and Normalize Feature List

Produce a priority-ordered feature table.

| #   | Feature Name   | Description (1 line)    | Dependencies | Complexity | Priority |
| --- | -------------- | ----------------------- | ------------ | ---------- | -------- |
| 1   | [Feature Name] | [What it does for user] | None         | S/M/L/XL   | P0       |

Complexity rubric:

- S: One focused component/function, no side effects.
- M: Multiple components/functions with integration.
- L: Cross-cutting concerns across data, UI, and logic.
- XL: Subsystem-level work; split when needed.

Priority rubric:

- P0: Core, app broken without it.
- P1: Important, app crippled without it.
- P2: Enhancement, app works but experience suffers.
- P3: Nice-to-have, defer if needed.

### Step 2: Resolve Dependencies

Map explicit unlock order and gating dependencies.

Example map:

- Feature 1 -> DONE -> unlocks Feature 2
- Feature 2 (needs 1) -> DONE -> unlocks Feature 3
- Feature 3 (needs 1,2) -> DONE -> unlocks Feature 4

If PRD has no order, apply default ranking:

1. Data models/schema/core entities
2. Core business logic/API/services
3. Primary UI/user interactions
4. Secondary UI/flows
5. Edge cases/error handling/polish
6. Nice-to-haves

### Step 3: Announce Execution Plan

Present ordered list and wait for single user confirmation.

Required format:

- Header: EXECUTION PLAN
- List each feature with name, one-line summary, complexity
- State rules:
  - Complete Feature 1 before Feature 2
  - Each feature ends with checklist confirmation
  - User may pause, redirect, reprioritize
  - Next feature starts only after user confirms
- End with: Type GO to begin Feature 1, or request reorder

## Feature Execution Loop

Always use: OPEN -> PLAN -> BUILD -> VERIFY -> GATE

### OPEN

Start each feature with a Feature Card:

- Feature N of total
- Priority and complexity
- Dependencies
- Goal
- Scope
- Out of Scope (mandatory)
- Assumptions

Out of Scope is mandatory to prevent scope creep.

### PLAN

Define a compact technical contract:

1. Data shape

- Entities/types/contracts created or changed

2. Module breakdown

- CREATE: new files/modules
- MODIFY: existing files/modules

3. Acceptance criteria

- Write 3-7 testable criteria
- If criteria cannot be written, ask one clarifying question then proceed

### BUILD

Implement fully, following standards:

- Single responsibility per function/component
- Prefer function length <= 40 lines; extract helpers when needed
- No direct state mutation
- Async states handled: loading, success, error
- Validate inputs at boundaries
- External calls wrapped with failure handling
- User-readable errors with debug context
- No leftover TODOs unless explicitly deferred
- No commented dead code
- No debug logs in production paths
- No untyped any in TypeScript

Implementation reporting format per file:

- File path and status (created or modified)
- Full code block
- For modified files, show what changed with before/after context

### VERIFY

Run internal checks before handoff.

Functional verification:

- Every acceptance criterion passes
- Happy path works end-to-end
- Error paths handled
- Relevant edge cases covered

Code verification:

- No dead code/debug artifacts
- No mixed-responsibility functions
- No state mutation
- Async and validation coverage complete

Integration verification:

- Previously shipped features remain working
- Shared contracts unchanged or clearly versioned
- New dependencies justified

If any check fails, fix before GATE.

### GATE

End every feature with mandatory completion summary.

Required sections:

- Feature completion banner
- What was built (files + behaviors)
- Acceptance criteria status with pass notes
- Known gaps deferred to later features
- Next unlocked feature
- Prompt user: Type NEXT to continue, or give feedback first

Do not start next feature until explicit user confirmation.

## Gate Status Board

Maintain a visible lock-state board.

States:

- Locked
- In Progress
- Complete

Rules:

- Only one feature in progress at a time
- No skipping dependency gates
- No partial completion labels
- New capabilities discovered mid-feature are queued, not built immediately
- User confirmation required to unlock next gate

## Scope Creep Protocol

When new requirements appear mid-feature, decide in 3 seconds:

- If needed to satisfy existing acceptance criteria: include now
- If net-new capability: queue as a new feature

Queueing format:

- Scope note with description
- Mark as out of scope for current feature
- Add new feature to end of queue
- Continue current feature

## Special Feature Types

### Data Model/Schema

Plan order:

1. Entities and fields
2. Relationships
3. Constraints and validation
4. Migration or seed updates
5. Typed interfaces/DTOs

### API/Service

Plan order:

1. API contract first: input/output/errors
2. Business logic
3. Boundary validation
4. Explicit failure handling
5. Usage example

### UI Component/Screen

Plan order:

1. Single job definition
2. Typed props/inputs
3. All UI states
4. Layout and hierarchy
5. Interactions and data wiring
6. Manual state testing

### Integration/Third-Party

Plan order:

1. External contract map
2. Abstraction layer
3. Auth/rate limit/timeout handling
4. Mock/stub for testability
5. Swap to real implementation

### Auth/Security

Plan order:

1. Threat model
2. Server-side first
3. Established crypto only
4. Token/session lifecycle complete
5. Unauthorized access tests

## Decision Log

Capture non-obvious decisions when they happen.

Fields:

- Feature
- Decision
- Rationale
- Trade-off
- Revisit trigger

## Supported User Commands

- GO: start from Feature 1
- NEXT: unlock next feature
- PAUSE: freeze current feature and show status
- REORDER: re-present feature table for reprioritization
- SKIP N: defer feature N to end with reason
- SPLIT N: divide feature N into smaller features
- STATUS: print gate board
- DECISIONS: print decision log
- GAPS: print deferred items

## Response Templates

### Execution Plan Template

1. Feature list with complexity and priority
2. Dependency notes
3. Gate rules summary
4. Prompt for GO

### Feature Card Template

- Feature N of total
- Priority, complexity, dependencies
- Goal
- Scope
- Out of Scope
- Assumptions

### Gate Summary Template

- Completed feature banner
- Built files and behaviors
- Acceptance criteria status
- Known gaps and assigned future feature
- Next unlocked feature
- Prompt for NEXT

## Completion Checklist

Before finishing all PRD work:

- All extracted features gated to complete or explicitly deferred
- End-to-end smoke check done
- Known gaps documented
- Tech debt list captured

## Usage Examples

- Execute this PRD with strict feature gates. Start Phase 0 and wait for GO.
- Ingest this requirement document, produce priority/dependency table, and run sequential OPEN PLAN BUILD VERIFY GATE.
- Continue from Feature 2 and show STATUS first, then proceed only after NEXT.
