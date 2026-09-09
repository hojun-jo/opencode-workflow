---
name: open-design
description: Expand an initial user flow into implementation-ready UX/UI direction, wireframes, screens, states, component guidance, and critique
compatibility: opencode
metadata:
  workflow-stage: open-design
---

# Open Design

Use this skill after requirements and an initial user flow exist. Open Design validates and refines the flow; it does not replace wireframes, but includes them as one form of design evidence.

The active artifact root is `workflow.artifact_root` in `.workflow/state.json`; all artifact paths below are relative to it.

## Full output

Create or update:

1. `design/DESIGN.md`
2. `design/user-flow.md`
3. At least one artifact in `design/wireframes/`
4. At least one artifact in `design/screens/`
5. `design/component-guidelines.md`
6. `design/design-review.md`
7. `traceability.json`

`DESIGN.md` is the canonical design handoff. It links the detailed artifacts and records the approved UX/UI direction, information hierarchy, navigation, key screens, interaction model, responsive behavior, accessibility, and unresolved choices.

For every important screen or surface, define relevant default, loading, empty, error, success, permission-denied, offline, and restricted/locked states. Record actions, system feedback, cancellation, recovery, destructive confirmations, keyboard/focus behavior, and accessibility semantics where applicable.

Explore meaningful alternatives before converging. `design-review.md` must state the options considered, critique against requirements and constraints, rejected directions with reasons, and remaining human decisions. Apply the existing design system when one exists; otherwise record a minimal, non-speculative visual direction and reusable component rules.

## Profile scope

- `full / OPEN_DESIGN`: produce the complete output above and stop at `PRODUCT_REVIEW`.
- `quick / OPEN_DESIGN_LITE`: create a compact `design/DESIGN.md` containing the refined flow, screen structure, key states/interactions, accessibility concerns, and UI-impact risks. Expand to Full or request human review when a material UX choice remains.
- `prototype / OPEN_DESIGN`: produce `DESIGN.md`, the refined user flow, and at least one artifact in both `wireframes/` and `screens/`. Keep only what is needed to test the hypothesis.
- `bugfix`: skip Open Design unless the defect changes UX/UI behavior materially. In that case request human review and recommend a bounded Quick or Full workflow rather than silently expanding scope.

## Exit rule

Check that every applicable requirement is represented in the refined flow, screen/state definitions, and traceability. Advance only through `workflow_complete_stage`; never edit `.workflow/state.json` or approve a human gate.
