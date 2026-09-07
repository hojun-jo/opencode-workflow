import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_RELATIVE_PATH = join(".opencode", "workflow-family.json");
const rootDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const gameStudioTemplate = join(rootDirectory, "game", "opencode-game-studio");
const gameKnowledgeTemplate = join(rootDirectory, "game", "awesome-gamedev-agent-skills");

export const supportedGameEngines = [
  "unity",
  "godot",
  "unreal",
  "gamemaker",
  "roblox",
  "love",
  "bevy",
  "phaser",
  "pixijs",
  "threejs",
  "pygame",
  "unknown",
];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function fileContains(path, pattern) {
  if (!existsSync(path)) return false;
  try {
    return pattern.test(readFileSync(path, "utf8"));
  } catch {
    return false;
  }
}

function rootFiles(directory) {
  try {
    return readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

export function detectGameEngine(directory) {
  const files = rootFiles(directory);
  if (existsSync(join(directory, "project.godot"))) return "godot";
  if (existsSync(join(directory, "Assets")) && existsSync(join(directory, "ProjectSettings", "ProjectVersion.txt"))) return "unity";
  if (files.some((name) => name.endsWith(".uproject"))) return "unreal";
  if (files.some((name) => name.endsWith(".yyp"))) return "gamemaker";
  if (files.some((name) => /\.(rbxl|rbxlx)$/.test(name) || name.endsWith(".project.json"))) return "roblox";
  if (existsSync(join(directory, "conf.lua")) || fileContains(join(directory, "main.lua"), /\blove\./)) return "love";
  if (fileContains(join(directory, "Cargo.toml"), /^bevy\s*=|^bevy\./m)) return "bevy";

  const packageJson = readJson(join(directory, "package.json"));
  const dependencies = { ...(packageJson?.dependencies ?? {}), ...(packageJson?.devDependencies ?? {}) };
  if (dependencies.phaser) return "phaser";
  if (dependencies["pixi.js"]) return "pixijs";
  if (dependencies.three) return "threejs";
  if (files.some((name) => name.endsWith(".py")) && files.some((name) => fileContains(join(directory, name), /^\s*(?:from\s+pygame|import\s+pygame)\b/m))) return "pygame";
  return null;
}

export function detectProjectFamily(directory) {
  const configured = readJson(join(directory, CONFIG_RELATIVE_PATH));
  if (["software", "game"].includes(configured?.family)) {
    return {
      family: configured.family,
      engine: configured.engine ?? null,
      confidence: "configured",
      source: CONFIG_RELATIVE_PATH,
      configured,
    };
  }

  if (existsSync(join(directory, ".workflow", "state.json"))) {
    return { family: "software", engine: null, confidence: "strong", source: ".workflow/state.json" };
  }

  const engine = detectGameEngine(directory);
  if (engine) return { family: "game", engine, confidence: "strong", source: "engine fingerprint" };
  if (existsSync(join(directory, "design", "gdd")) || existsSync(join(directory, ".opencode", "docs", "technical-preferences.md"))) {
    return { family: "game", engine: null, confidence: "medium", source: "game design structure" };
  }

  const softwareSignals = ["pubspec.yaml", "package.json", "go.mod", "pyproject.toml", "requirements.txt", "Cargo.toml"];
  const signal = softwareSignals.find((name) => existsSync(join(directory, name)));
  if (signal) return { family: "software", engine: null, confidence: "medium", source: signal };
  return { family: null, engine: null, confidence: "unknown", source: null };
}

function copyMissing(source, destination) {
  if (!existsSync(source)) throw new Error(`Missing bundled game studio template: ${source}`);
  mkdirSync(destination, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      copyMissing(from, to);
    } else if (!existsSync(to)) {
      cpSync(from, to);
    }
  }
}

function writeIfMissing(path, content) {
  if (existsSync(path)) return false;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return true;
}

function assertFamilySwitch(directory, family, allowSwitch) {
  const current = readJson(join(directory, CONFIG_RELATIVE_PATH));
  if (current?.family && current.family !== family && !allowSwitch) {
    throw new Error(`Project is already configured as ${current.family}. Re-run with allowSwitch: true only after the user explicitly approves the family change.`);
  }
  if (family === "game" && existsSync(join(directory, ".workflow", "state.json"))) {
    throw new Error("A managed software workflow exists in .workflow/state.json. Finish or explicitly retire it before configuring this project as user-driven game development.");
  }
}

function gameRule() {
  return `---
paths:
  - "**"
---

# Game Workflow Family

- This is a user-driven OpenCode Game Studios project, not a managed Workflow Controller project.
- Follow Question -> Options -> Decision -> Draft -> Approval. Never auto-run the next game workflow skill.
- Use OGS roles for game process and ownership. Do not use OMO as the default orchestrator; Explore, Librarian, and Oracle remain optional support tools.
- Start every concrete game implementation request by loading \`gamedev-router\`, then load only the engine/task skills it selects.
- Read the project's pinned engine version before choosing APIs. Check current official engine documentation when the relevant API may have changed.
- Engine editor changes should use the configured engine MCP when available. If no MCP is configured, state that limitation and operate on files only.
- Ponytail modes are task-local: OFF for brainstorm/GDD/game design, LITE for architecture, FULL for implementation/bugfix/code review. Do not change the global default.
- Ponytail FULL means the smallest correct change, native engine capabilities first, no speculative abstractions, and no unrelated refactors.
- Never simplify away trust-boundary validation, data-loss prevention, security, accessibility basics, or an explicit user requirement.
- The user makes final decisions about fun, feel, art direction, difficulty, level design, scope, and release readiness.
`;
}

function adaptedOpenCodeDocument() {
  const source = readFileSync(join(gameStudioTemplate, "OPENCODE.md"), "utf8");
  return source
    .replace("run `/start` to begin the guided onboarding flow.", "run `/game/start` to begin the guided onboarding flow.")
    .concat("\n\n## Workflow Family Integration\n\n@.opencode/rules/workflow-family.md\n");
}

export function initializeProjectFamily(directory, { family, engine = "unknown", allowSwitch = false } = {}) {
  if (!["software", "game"].includes(family)) throw new Error("Family must be either 'software' or 'game'.");
  if (family === "game" && !supportedGameEngines.includes(engine)) {
    throw new Error(`Unsupported game engine '${engine}'. Supported: ${supportedGameEngines.join(", ")}.`);
  }
  assertFamilySwitch(directory, family, allowSwitch);

  const initializedAt = new Date().toISOString();
  const manifest = family === "software"
    ? {
      schema_version: 1,
      family: "software",
      controller: "managed-state-machine",
      orchestration: "oh-my-openagent",
      profiles: ["full", "quick", "bugfix", "prototype"],
      ponytail_default: "off",
      initialized_at: initializedAt,
    }
    : {
      schema_version: 1,
      family: "game",
      engine,
      controller: "none",
      process: "opencode-game-studio",
      orchestration: "user-driven",
      knowledge: "awesome-gamedev-agent-skills",
      engine_mcp: { engine, status: "configure-per-project" },
      ponytail_default: "off",
      ponytail_modes: {
        brainstorm_and_design: "off",
        architecture: "lite",
        implementation_bugfix_review: "full",
      },
      initialized_at: initializedAt,
    };

  mkdirSync(join(directory, ".opencode"), { recursive: true });
  if (family === "game") {
    copyMissing(join(gameStudioTemplate, "agents"), join(directory, ".opencode", "agents"));
    copyMissing(join(gameStudioTemplate, "skills"), join(directory, ".opencode", "skills"));
    copyMissing(join(gameKnowledgeTemplate, "skills"), join(directory, ".opencode", "skills"));
    copyMissing(join(gameStudioTemplate, "docs"), join(directory, ".opencode", "docs"));
    copyMissing(join(gameStudioTemplate, "rules"), join(directory, ".opencode", "rules"));
    writeIfMissing(join(directory, ".opencode", "rules", "workflow-family.md"), gameRule());
    writeIfMissing(join(directory, "OPENCODE.md"), adaptedOpenCodeDocument());
  }
  writeFileSync(join(directory, CONFIG_RELATIVE_PATH), `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    ...manifest,
    config: CONFIG_RELATIVE_PATH,
    next_command: family === "software" ? "/start <full|quick|bugfix|prototype> <goal>" : "/game/start",
    game_assets: family === "game" ? {
      agents: "project-local OpenCode Game Studios agents",
      process_skills: "project-local OpenCode Game Studios skills",
      knowledge_router: "project-local gamedev-router",
      mcp: "configure the matching engine MCP per project",
    } : null,
  };
}
