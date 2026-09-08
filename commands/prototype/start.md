---
description: Start a lightweight prototype workflow with automatic worker dispatch
agent: plan
subagent: false
---

Call `workflow_start` with `profile: "prototype"`, the hypothesis to test, and `dispatch: true`. Define a user flow and focused Open Design before building. Keep scope deliberately minimal; production architecture and exhaustive coverage are out of scope unless essential to the experiment. The controller automatically runs the independent prototype review, evaluation, and decision stages after the build.
