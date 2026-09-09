---
name: architecture
description: Design implementation architecture after product approval, including boundaries, data flow, failure handling, tests, and ADRs
compatibility: opencode
metadata:
  workflow-stage: architecture
---

# Architecture

Run only when `gates.product_design.status` is `approved`.

The active artifact root is `workflow.artifact_root` in `.workflow/state.json` (for example, `.workflow/runs/<run-id>`). All artifact paths below are relative to that root.

Read the approved specification, Open Design artifacts, project rules, and relevant existing code. Architecture must consume the resolved screen structure and interaction/state definitions instead of guessing product behavior. Create `architecture/architecture.md` covering:

- Current-system constraints and proposed module boundaries
- State and data flow
- Public APIs, interfaces, persistence, and migrations
- Error handling, retries, cancellation, and observability
- Security, privacy, performance, and accessibility implications where relevant
- Dependency choices and rejected alternatives
- Testing strategy by layer
- Rollout, compatibility, and rollback risks

Reference requirement IDs throughout. Record consequential, hard-to-reverse choices in `architecture/decisions/ADR-NNN-title.md` with context, decision, alternatives, consequences, and status.

Do not modify product source or workflow state. Update architecture links in traceability, then call `workflow_complete_stage` for `ARCHITECTURE`.
