---
description: Show the detected Software/App or Game workflow family
agent: plan
subtask: false
---

Call `workflow_family_detect` and report the configured or detected family, engine, confidence, evidence source, and the next appropriate command.

- Software/App: `/start <full|quick|bugfix|prototype> <goal>`
- Game: `/game/start` or the relevant OGS skill selected by the user
- Unknown: `/init`

Do not modify files or start a workflow.
