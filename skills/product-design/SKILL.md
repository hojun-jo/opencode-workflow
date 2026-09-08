---
name: product-design
description: Define a feature specification and initial user flow with stable requirements before Open Design
compatibility: opencode
metadata:
  workflow-stage: product-design
---

# Product design

Use this skill for the workflow's feature-definition and initial-user-flow stages. Complete only the active stage; the controller dispatches the following Open Design stage.

## Inputs

- User goal, constraints, and requested changes
- Existing project behavior and project `AGENTS.md`
- Existing `.workflow/` artifacts, if present

## Required outputs

At `FEATURE_DEFINITION`, create or update `.workflow/requirements/feature-spec.md` and initialize applicable traceability. At `USER_FLOW`, create or update `.workflow/design/user-flow.md` and extend traceability for the flow.

## Feature specification

- State the user problem, goals, non-goals, assumptions, constraints, and terminology.
- Give every functional and non-functional requirement a stable ID: `REQ-<DOMAIN>-NNN`.
- Give each acceptance criterion a stable ID: `AC-<DOMAIN>-NNN` and link it to requirement IDs.
- Cover validation, empty/loading/error/success states, permissions, recovery, and relevant edge cases.
- Mark unresolved choices explicitly. Do not invent material product decisions.

## Initial user flow

- Map entry points, user actions, system responses, branches, cancellation, failure, and recovery.
- Reference requirement and acceptance-criterion IDs in each relevant flow.
- Leave screen hierarchy, wireframes, visual direction, component guidance, and design critique to the Open Design stage.

## Exit rule

Check the evidence required for the active stage and update traceability where applicable. Advance only the active stage by calling `workflow_complete_stage`; never edit `.workflow/state.json`, call `workflow_dispatch`, approve a gate, or begin architecture.
