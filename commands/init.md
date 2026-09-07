---
description: Choose and initialize the Software/App or Game workflow family
agent: plan
subtask: false
---

Initialize the current project workflow family from `$ARGUMENTS`.

First call `workflow_family_detect`. Treat detected files as evidence, not as permission to choose a family for the user.

Accepted explicit forms:

- `/init software`
- `/init app`
- `/init game <unity|godot|unreal|gamemaker|roblox|love|bevy|phaser|pixijs|threejs|pygame>`

If no family is explicit, show the detection result and ask the user to choose exactly one: `Software / App` or `Game`. If Game is chosen and the engine is not explicit or strongly detected, ask which engine they use; `unknown` is valid when they have not decided.

Then call `workflow_family_init` exactly once with the selected family and engine. Never set `allowSwitch: true` unless the user explicitly approved changing an existing configured family.

For Software/App, the tool initializes the managed controller and its `full`, `quick`, `bugfix`, and `prototype` profiles. Recommend `/start <profile> <goal>`; do not start a workflow automatically.

For Game, do not initialize `.workflow`, do not dispatch OMO, and do not create a game state machine. The tool installs the project-local OGS docs/rules and records the detected engine. Explain that OGS owns roles/process, `gamedev-router` owns engine/task knowledge, the matching engine MCP must be configured per project, and the user controls every transition. Recommend `/game/start`; do not run the next game skill automatically.
