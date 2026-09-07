---
description: Initialize project-local workflow state and artifact directories
agent: build
subagent: false
---

Initialize the development workflow in the current project.

Call the `workflow_init` tool now. This call is mandatory; do not emulate it with ordinary file edits or shell commands.

Then read `.workflow/state.json` and `.workflow/traceability.json` to verify the result. The initializer preserves valid existing JSON and creates only missing state, traceability, and directories. Do not rewrite these files, create product artifacts, or modify source code in this command.

Report whether each file was created or preserved, the actual current stage from state, and tell the user to run `/start full <feature goal>`.
