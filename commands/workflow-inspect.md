---
description: Inspect existing artifacts and recommend a safe brownfield workflow start point
agent: plan
subagent: false
---

Inspect `$ARGUMENTS`. Parse the first token as `full`, `quick`, `bugfix`, or `prototype`; default to `full`. Parse repeatable `--source STAGE=PATH_OR_URL` references.

Call `workflow_inspect` exactly once. Do not initialize workflow state or edit files. Report detected managed and conventional sources, each stage validation result, warnings and blockers, existing implementation coverage, required human gates, and the exact recommended `/start <profile> --from <point> ...` command. Never claim that a gate is approved merely because its artifacts exist.
