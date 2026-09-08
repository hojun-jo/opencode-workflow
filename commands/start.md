---
description: Inspect and start a greenfield or brownfield workflow from an appropriate stage
agent: plan
subagent: false
---

Start a workflow from `$ARGUMENTS`. Parse the first token as one of `full`, `quick`, `bugfix`, or `prototype`; treat non-option text as the required goal. If no profile is given, use `full`.

Supported options:

- `--from start|auto|design|architecture|planning|build|review`
- `--verified-gate product_design|implementation_plan` (repeatable)
- `--source STAGE=PATH_OR_URL` (repeatable)
- `--reset`

Never infer `--verified-gate`; pass it only when the user explicitly states that the imported material was already approved by a human. A source reference is evidence metadata, not approval.

When `--from` is absent, call `workflow_inspect` first. If it recommends a point later than `start`, report detected artifacts, validation warnings, required gates, implementation coverage, and the exact suggested `/start ... --from ...` command; do not start until the user confirms. If it recommends `start`, call `workflow_start` once with `from: "start"` and `dispatch: true`.

When `--from` is present, call `workflow_start` exactly once with the parsed options and `dispatch: true`. The controller imports and validates earlier stages. It may stop at the earliest invalid stage or an unsatisfied human gate instead of the requested stage. Do not create or edit workflow artifacts directly. Report the requested and actual stage, import result (`IMPORTED`, `IMPORT_WITH_WARNINGS`, or `BLOCKED`), stage statuses, gate required, implementation coverage summary, and worker session ID if one was created. If the controller reports an active workflow, do not reset it unless the user explicitly asks to restart it.
