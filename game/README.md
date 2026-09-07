# OpenCode Workflow Family

This directory stores the upstream templates used by the global workflow-family integration. Game agents and skills are copied into a project's `.opencode/` only after the user selects Game with `/init`, so Software/App projects do not advertise game-only capabilities.

## Runtime split

- Software/App: Custom Workflow Controller -> OMO -> software skills -> Ponytail
- Game: OpenCode Game Studios -> user-driven decisions -> `gamedev-router` -> engine MCP -> Ponytail

The game path intentionally has no automatic state-machine controller. `/init` records the selected family. `/game/start` runs OGS onboarding without auto-advancing to another skill.

## Upstream sources

- OpenCode Game Studios, commit `47a097d32454da5914c6383f9eb9d77582e2122f`
- awesome-gamedev-agent-skills, commit `7110607ab816ece9669274bc84937857a8819796`

At the recorded revisions this bundle contains 55 upstream OGS agents, 37 OGS workflow skills, and 68 specialized game-development skills plus the router. The integration adds one model-neutral `game-studio` primary coordinator so `/game/start` does not run through OMO's primary orchestrator.

The vendored LICENSE and README files remain beside each source's templates and documentation.
