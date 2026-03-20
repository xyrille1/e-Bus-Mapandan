---
name: priority-first
description: "Finish multi-feature builds one feature at a time with strict verification gates. Use when user asks to build apps/scripts/docs/APIs with multiple features, steps, or components; enforce queue ranking, complete current feature end-to-end, verify before advancing, and avoid placeholders or parallel scaffolding. Triggers: build this app, add these features, create X with A B C, implement wishlist, do X Y Z."
argument-hint: "Provide requested features and any priority/dependency order."
user-invocable: true
---

# Priority-First Skill

One thing. Fully working. Then the next thing.

This skill governs how the agent approaches any multi-feature or multi-step build.
The guiding principle: a half-built feature that works is worth more than five
features that are broken.

## Core Principle

When given a list of things to build or do, treat it as a sequential queue.
Do not advance until the current head item is fully verified and working.

Wrong approach:
- Build skeleton for all five features
- Fill each one partially
- Ship a mostly working app full of TODOs and placeholders

Right approach:
- Pick feature #1
- Implement it completely
- Verify it
- Report completion
- Move to feature #2

## Workflow

### Step 1 - Identify and Rank the Feature Queue

When the user provides features, tasks, or requirements:

1. Extract all requested features/tasks explicitly from the user message.
2. Rank by this order:
- User-stated priority (first/most important/start with) always wins.
- Dependency order (prerequisites before dependents).
- Foundation before decoration (logic/data/auth/routing/state before polish).
- Complexity tie-breaker (simpler first for a fast working baseline).
3. State the queue explicitly before building.

Queue statement format:
- "I'll build these in this order: (1) auth, (2) data model, (3) dashboard UI, (4) export. Starting #1 now."

Do not silently assume ordering.

### Step 2 - Build Feature #1 Fully

A feature is complete only when all are true:

- Functionally complete: all sub-parts implemented, no stubs.
- No broken imports/references: all symbols/files exist and resolve.
- No placeholder logic: no TODO/pass/NotImplemented/return null/fake success paths unless user explicitly approved stubs.
- Self-consistent: does not depend on "will add later" items.
- Verified: happy path confirmed by run, trace, or structural audit.

### Step 3 - Verify Before Advancing

Before moving to the next feature, perform one verification method:

1. Run it (preferred): execute and confirm expected output.
2. Trace it: explicit input->flow->output reasoning.
3. Structural audit: confirm imports/exports/call sites are wired with no dangling references.

Never announce done and move on without verification.

### Step 4 - Report and Checkpoint

After completing and verifying a feature:

1. Show what was completed (code/output/result).
2. State what was verified.
3. Announce the next queue item.
4. If the build is long (4+ features) or intent is ambiguous, pause for user confirmation after each completed feature.

Status line format:
- "Feature #1 (auth) is complete and verified. Moving to Feature #2 (data model)."

### Step 5 - Repeat Until Queue Is Empty

Repeat Steps 2-4 for each item.
After all items are complete, do a final integration check to verify features work together.

## Hard Rules

Never scaffold everything first.
- Do not create broad project skeletons with stubs for future features.
- Exception: minimal entry container is allowed only for the current feature.

Never leave current feature broken to start the next.
- If a dependency is discovered, re-rank queue and finish the prerequisite first.

Never use fake data/placeholders without explicit user agreement.
- If user explicitly requests stubs, label clearly:
- "STUB - replace with real implementation before use"

Never defer and forget.
- If deferred, keep it in queue and implement in turn, or explicitly agree to remove from scope.

Never advance on failed verification.
- Fix current feature, re-verify, then continue.

## Handling Common Situations

User gives a giant list:
1. Extract and number features.
2. Propose order with brief reasoning.
3. Ask user to confirm/reorder.
4. Execute sequentially.

User says "build the whole thing":
- Interpret as build all features properly in sequence, not permission to scaffold/stub.

Later feature requires refactor of earlier feature:
1. Pause current feature.
2. Refactor earlier feature.
3. Re-verify earlier feature.
4. Resume current feature.

User interrupts with a new feature:
1. Acknowledge request.
2. Insert into queue at requested position (or end by default).
3. Finish current feature.
4. Address new item in turn.

Time/context pressure:
1. Finish current feature before stopping.
2. Record queue status (done/verified/remaining).
3. Provide handoff summary for next session.

## Quality Bar

A feature is fully working only if a skeptical user could test it now and it would pass.

Self-check:
- Would this work for someone new to the code?
- Any hidden assumptions not yet implemented?
- Most obvious error case covered?
- Safe enough to run in production-like conditions?

If any answer is no or maybe, feature is not done.

## Anti-Patterns to Reject

- "I'll flesh this out in the next step"
- Parallel scaffolding across many features
- Shipping TODO-based implementations
- "This works once we add X"
- Mixing current feature with next-feature boilerplate
- Silently skipping hard features

## Example Execution

User request:
- "Build a React todo app with task list, add, delete, mark complete, and local storage persistence."

Queue:
1. Task list display
2. Add task
3. Delete task
4. Mark complete
5. Local storage persistence

Then:
- Complete and verify #1 before starting #2
- Continue until all features are complete and integrated

## Summary Checklist

1. Extract feature list.
2. Rank by priority/dependencies.
3. State queue explicitly.
4. Implement only current feature fully.
5. Verify current feature.
6. Report completion and next item.
7. Repeat.
8. Run final integration check.

Goal:
- Not "most code written"
- Working software delivered one verified feature at a time
