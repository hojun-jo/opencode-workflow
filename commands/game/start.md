---
description: Start user-driven OpenCode Game Studios onboarding
agent: game-studio
subtask: false
---

Call `workflow_family_detect` first. Require `family: "game"`; otherwise recommend `/init game <engine>` and stop.

Load `game-start` and follow its guided onboarding exactly. This is a user-driven process: ask, present options, wait for the user's decision, and recommend one next OGS skill without invoking it automatically.

Do not initialize or use the managed Software Workflow Controller. You are already running through the `game-studio` primary coordinator; do not use OMO as the default orchestrator. For a concrete game implementation request after onboarding, load `gamedev-router` before selecting engine and task skills.
