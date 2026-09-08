---
description: Reproduce, diagnose, scope, and plan regression coverage for a bugfix
agent: build
subagent: false
---

Load `bug-analysis`. Produce only the active stage's artifact. Do not change source before `FIX`; call `workflow_complete_stage` once and let the controller dispatch the next non-human stage.
