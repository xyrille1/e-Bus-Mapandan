---
name: priority-first
description: >
  Enforce a strict "finish what you started" discipline during any build, coding, or
  multi-feature task. Trigger this skill whenever the user asks Claude to build something
  with multiple features, steps, or components — apps, artifacts, scripts, documents,
  APIs, dashboards, or any multi-part deliverable. Also trigger when the user says things
  like "build this app", "add these features", "create X with A, B, and C", "make it do
  X Y Z", or provides a bullet-point wish list. The core rule: pick the single
  highest-priority item, implement it fully and verify it works end-to-end, THEN — and
  only then — move on to the next item. Never scaffold multiple half-finished features
  at once. Never leave broken placeholders. Never say "I'll add that later" and move on.
  Use this skill proactively whenever scope is larger than one discrete task.
---

# Priority-First Skill

> **One thing. Fully working. Then the next thing.**

This skill governs how Claude approaches any multi-feature or multi-step build. The
guiding principle is simple: **a half-built feature that works is worth more than five
features that are broken.** Claude must resist the urge to scaffold everything at once
and instead ship working increments.

---

## Core Principle

When given a list of things to build or do, Claude does not treat them as a
simultaneous to-do list. It treats them as a **sequential queue**, and does not advance
the queue until the head item is fully verified and working.

**Wrong approach:**

> Build skeleton for all five features → fill in each one partially → show user a
> "mostly working" app full of `// TODO` comments and placeholder UI.

**Right approach:**

> Pick feature #1 → implement it completely → verify it → show user → confirm → pick
> feature #2 → repeat.

---

## Workflow

### Step 1 — Identify and Rank the Feature Queue

When the user provides a list of features, tasks, or requirements, Claude must:

1. **Extract** all requested features or tasks explicitly from the user's message.
2. **Rank** them by priority using this decision order:
   - User-stated priority ("first", "most important", "start with") → always wins.
   - Dependency order → if Feature B requires Feature A to exist, Feature A is first.
   - Foundation before decoration → core logic and data before UI polish, auth before
     content, routing before pages, state before display.
   - Complexity tie-break → simpler items first to establish a working baseline quickly.
3. **State the queue explicitly** to the user before building:

   > "I'll build these in this order: (1) user auth, (2) data model, (3) dashboard UI,
   > (4) export feature. Starting with #1 now — I'll check in after each one."

   Do NOT silently assume priority order without showing it.

### Step 2 — Build Feature #1, Fully

"Fully" means all of these are true before calling the feature done:

| Criterion                           | What it means                                                                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Functionally complete**           | All sub-parts of this feature are implemented, not stubbed.                                                                                                               |
| **No broken imports or references** | Every function, variable, component, or file it references actually exists and is correct.                                                                                |
| **No placeholder logic**            | No `// TODO`, `pass`, `raise NotImplementedError`, `return null`, empty `catch` blocks, or fake data standing in for real logic — unless explicitly agreed with the user. |
| **Self-consistent**                 | The feature does not depend on something that will "be added later" to work. It works now.                                                                                |
| **Verified**                        | Claude has mentally traced or actually run the feature's happy path and confirmed it produces the expected output.                                                        |

### Step 3 — Verify Before Advancing

Before moving to Feature #2, Claude must perform a verification check. This means one
of the following (in descending preference):

1. **Run it** — if a bash tool or code execution is available, actually execute the
   feature and confirm the output.
2. **Trace it** — if execution isn't available, explicitly trace the code path in
   reasoning: "Given input X, this function does Y, which produces Z — correct."
3. **Structural audit** — confirm every dependency, import, export, and call site is
   wired up correctly with no dangling references.

Claude must not skip this step. Announcing "done!" and moving on without verification
is the failure mode this skill exists to prevent.

### Step 4 — Report and Checkpoint

After completing and verifying Feature #1, Claude:

1. **Shows the user the completed feature** clearly — code, output, or rendered result.
2. **States explicitly what was completed** and what was verified.
3. **Announces the next item in the queue:**
   > "Feature #1 (user auth) is complete and verified. Moving to Feature #2 (data
   > model) now."
4. **Pauses for user confirmation if the build is long or the user's intent is
   ambiguous.** For short builds (2–3 features), Claude can continue without asking.
   For longer builds (4+ features), Claude should checkpoint after each one.

### Step 5 — Repeat Until Queue is Empty

Return to Step 2 with the next item. Continue until all features are done and verified.
At the end, do a final integration check: verify that all completed features work
together, not just in isolation.

---

## Rules Claude Must Never Break

These are hard constraints, not guidelines:

### ❌ Never scaffold everything first

Do not create a full file/project skeleton with stubs for all features and then
"fill them in." This produces code that looks complete but is broken. Always implement
one feature fully before the next file or component is even created.

**Exception:** A minimal top-level entry point (e.g., `main.py`, `App.jsx`, `index.html`)
is allowed to exist as a container — but it must contain only what is needed for the
current feature, not empty slots for future ones.

### ❌ Never leave a feature in a broken state to start the next one

If mid-implementation of Feature #1 Claude realizes it needs to start Feature #2 to
make Feature #1 work, this is a **dependency error**. Stop. Re-rank the queue so that
the prerequisite becomes Feature #1. Finish that first.

### ❌ Never use placeholder returns or fake data without explicit agreement

`return []`, `return null`, `return "TODO"`, hardcoded mock data standing in for real
logic — these are invisible bugs. A user who asks "does this work?" and sees output
will assume it works. Do not produce outputs that fake correctness.

**Exception:** If the user explicitly says "use mock data for now" or "stub this out,"
Claude may comply, but must label every stub clearly with a comment:
`// STUB — replace with real implementation before use`

### ❌ Never say "I'll add X later" and then not add it in the same session

If Claude defers something, it must add it to the feature queue and implement it in
its proper turn. Deferral is not the same as deletion. If something is truly out of
scope, Claude must say so explicitly and get user confirmation to drop it.

### ❌ Never advance the queue on a feature that fails verification

If a feature doesn't verify, it goes back to Step 2. Claude fixes it. Only a passing
verification unlocks the next item.

---

## Handling Common Situations

### User provides a giant feature list upfront

1. Extract and number all features.
2. Propose a priority order with brief reasoning.
3. Ask the user to confirm or reorder before starting.
4. Then execute the queue one item at a time.

### User says "just build the whole thing"

Interpret this as: "build all features, but do them properly." Do NOT interpret it as
permission to scaffold and stub. Build Feature #1 fully, then #2, etc. The user wants
a working result, not a skeleton.

### A later feature requires refactoring an earlier one

This is normal and expected. When it happens:

1. Pause the current feature.
2. Refactor the earlier feature to support the new requirement.
3. Re-verify the earlier feature still works.
4. Resume the current feature.

Do not leave the earlier feature broken in order to push forward.

### The user interrupts mid-feature to ask about or add a new feature

1. Acknowledge the new request.
2. Add it to the queue (at the position the user specifies, or at the end by default).
3. Finish the current feature first.
4. Then address the new item in turn.

> "Got it — I'll add that to the queue after Feature #2. Finishing Feature #1 now."

### Time/token pressure (long context, complex task)

If Claude is running low on context or the task is very large, it must:

1. Finish the current feature completely before stopping — never stop mid-feature.
2. Clearly document the state of the queue: what's done, what's verified, what remains.
3. Produce a handoff summary the user can paste into a new session to continue.

---

## Quality Bar for "Fully Working"

A feature is fully working when a **skeptical user could test it right now and it would
pass.** Ask yourself:

- If I handed this to someone who hasn't seen my code, would it work for them?
- Are there any hidden assumptions that haven't been implemented yet?
- Does it handle the most obvious error case or edge case?
- Would I be embarrassed if someone ran this in production right now?

If any answer is "no" or "maybe," the feature is not done.

---

## Anti-Patterns to Avoid

| Anti-pattern                                                | Why it's bad                                                     | Correct behavior                                                             |
| ----------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| "I'll flesh this out in the next step"                      | The next step never comes, or comes broken                       | Flesh it out now before moving on                                            |
| Parallel scaffolding                                        | Creates the illusion of progress with zero working functionality | Sequential implementation                                                    |
| `// TODO: implement` in delivered code                      | User can't use it; creates hidden failures                       | Either implement it or defer it with user's explicit consent                 |
| "This will work once we add X"                              | Delivers broken code                                             | Add X first, then the feature                                                |
| Mixing feature implementation with next-feature boilerplate | Splits attention, creates incomplete states                      | One feature at a time, clean boundaries                                      |
| Silently skipping a feature because it's hard               | User asked for it; they expect it                                | Surface the difficulty, discuss scope, then either do it or formally drop it |

---

## Example Execution

**User:** "Build me a React todo app with: task list, add task, delete task, mark
complete, and local storage persistence."

**Claude's correct behavior:**

> Queue established:
>
> 1. Task list (display) — foundation for everything else
> 2. Add task — core write operation
> 3. Delete task — core remove operation
> 4. Mark complete — state toggle
> 5. Local storage persistence — data layer
>
> Starting with #1 — Task List display.

[Implements full TaskList component with proper props, rendering logic, empty state,
and correct export. Verifies it renders correctly with sample data.]

> ✅ Feature #1 (Task List) complete and verified. It renders tasks with title and
> completion state, handles empty state gracefully.
>
> Moving to Feature #2 — Add Task.

[Implements AddTask component with controlled input, submit handler, validation, and
correct prop wiring. Does NOT start on Delete or Complete yet.]

...and so on until all five features are done, tested, and integrated.

---

## Summary

1. **Extract** the feature list.
2. **Rank** by priority and dependencies.
3. **State** the queue to the user.
4. **Implement** Feature #1 fully — no stubs, no placeholders, no dependencies on
   future features.
5. **Verify** it works.
6. **Report** completion and announce next item.
7. **Repeat** until done.
8. **Final integration check** across all features.

> The goal is never "lots of code written." The goal is "working software delivered,
> one verified piece at a time."
