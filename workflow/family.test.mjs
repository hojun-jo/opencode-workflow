import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import test from "node:test";
import { detectGameEngine, detectProjectFamily, initializeProjectFamily } from "./family.mjs";

function workspace() {
  const directory = mkdtempSync(join(tmpdir(), "opencode-family-"));
  return {
    directory,
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

test("detects common game engine fingerprints before generic software signals", () => {
  const work = workspace();
  try {
    mkdirSync(join(work.directory, "Assets"));
    mkdirSync(join(work.directory, "ProjectSettings"));
    writeFileSync(join(work.directory, "ProjectSettings", "ProjectVersion.txt"), "m_EditorVersion: 6000.0");
    writeFileSync(join(work.directory, "package.json"), "{}\n");

    assert.equal(detectGameEngine(work.directory), "unity");
    assert.deepEqual(detectProjectFamily(work.directory), {
      family: "game",
      engine: "unity",
      confidence: "strong",
      source: "engine fingerprint",
    });
  } finally {
    work.cleanup();
  }
});

test("detects software projects when no game engine fingerprint exists", () => {
  const work = workspace();
  try {
    writeFileSync(join(work.directory, "pubspec.yaml"), "name: sample\n");
    assert.deepEqual(detectProjectFamily(work.directory), {
      family: "software",
      engine: null,
      confidence: "medium",
      source: "pubspec.yaml",
    });
  } finally {
    work.cleanup();
  }
});

test("game initialization installs project-local OGS context without a managed workflow", () => {
  const work = workspace();
  try {
    const result = initializeProjectFamily(work.directory, { family: "game", engine: "godot" });
    const manifest = JSON.parse(readFileSync(join(work.directory, ".opencode", "workflow-family.json"), "utf8"));

    assert.equal(result.family, "game");
    assert.equal(result.controller, "none");
    assert.equal(result.next_command, "/game/start");
    assert.equal(manifest.engine, "godot");
    assert.equal(manifest.ponytail_modes.architecture, "lite");
    assert.equal(existsSync(join(work.directory, ".workflow", "state.json")), false);
    assert.equal(existsSync(join(work.directory, ".opencode", "docs", "technical-preferences.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "rules", "workflow-family.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "agents", "gameplay-programmer.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "agents", "game-studio.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "skills", "game-start", "SKILL.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "skills", "gamedev-router", "SKILL.md")), true);
    assert.equal(existsSync(join(work.directory, ".opencode", "skills", "unity-csharp-scripting", "SKILL.md")), true);
    assert.match(readFileSync(join(work.directory, "OPENCODE.md"), "utf8"), /\/game\/start/);
  } finally {
    work.cleanup();
  }
});

test("game initialization preserves existing project-local OGS documents", () => {
  const work = workspace();
  try {
    const preferences = join(work.directory, ".opencode", "docs", "technical-preferences.md");
    mkdirSync(join(work.directory, ".opencode", "docs"), { recursive: true });
    writeFileSync(preferences, "project choice\n");

    initializeProjectFamily(work.directory, { family: "game", engine: "unreal" });
    assert.equal(readFileSync(preferences, "utf8"), "project choice\n");
  } finally {
    work.cleanup();
  }
});

test("family changes require explicit approval and game rejects managed workflow state", () => {
  const work = workspace();
  try {
    initializeProjectFamily(work.directory, { family: "software" });
    assert.throws(
      () => initializeProjectFamily(work.directory, { family: "game", engine: "unity" }),
      /allowSwitch: true/,
    );

    rmSync(join(work.directory, ".opencode", "workflow-family.json"));
    mkdirSync(join(work.directory, ".workflow"));
    writeFileSync(join(work.directory, ".workflow", "state.json"), "{}\n");
    assert.throws(
      () => initializeProjectFamily(work.directory, { family: "game", engine: "unity" }),
      /managed software workflow exists/,
    );
  } finally {
    work.cleanup();
  }
});
