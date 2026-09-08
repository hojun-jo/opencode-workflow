---
description: Implement one approved ready task using a verified TDD cycle
agent: build
model: opencode-go/qwen3.8-flash
subagent: false
---

Implement exactly one task. Requested task ID or focus: `$ARGUMENTS`.

Require an approved implementation-plan gate and a valid build-stage transition. Load `tdd-build`. Select the requested task if eligible, otherwise the first ready task. If the current task is `fix_required`, address only its recorded findings. Confirm dependencies and linked requirements before editing.

Execute RED, GREEN, REFACTOR, VERIFY; record observed commands and outcomes. Keep scope to the task and relevant documentation. Mark the task `review_ready` in `tasks.json`, then call `workflow_complete_stage` with `stage: "BUILD"`; the controller starts independent `TASK_REVIEW` automatically. Do not self-review, directly edit `.workflow/state.json`, or mark the task done.
