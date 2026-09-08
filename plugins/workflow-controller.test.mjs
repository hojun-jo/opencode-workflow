import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import WorkflowController from "./workflow-controller.ts";
import { approveGate, completeStage, startWorkflow } from "../workflow/engine.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "opencode-workflow-controller-"));
  return {
    directory,
    artifact(relativePath, content = "evidence\n") {
      const path = join(directory, ".workflow", relativePath);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content, "utf8");
    },
    cleanup() {
      rmSync(directory, { recursive: true, force: true });
    },
  };
}

function complete(directory, stage) {
  return completeStage(directory, { stage, summary: `${stage} verified` });
}

test("implementation-plan revisions remain available while the gate is waiting", async () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "full", goal: "Controller gate test" });
    work.artifact("requirements/feature-spec.md");
    complete(work.directory, "FEATURE_DEFINITION");
    work.artifact("design/user-flow.md");
    complete(work.directory, "USER_FLOW");
    work.artifact("design/DESIGN.md");
    work.artifact("design/wireframes/main.md");
    work.artifact("design/screens/main.md");
    work.artifact("design/component-guidelines.md");
    work.artifact("design/design-review.md");
    complete(work.directory, "OPEN_DESIGN");
    approveGate(work.directory, { gate: "product_design" });
    work.artifact("architecture/architecture.md");
    complete(work.directory, "ARCHITECTURE");
    work.artifact("tasks/tasks.json", JSON.stringify({ tasks: [{ id: "T-1", status: "ready" }] }));
    complete(work.directory, "TASK_DECOMPOSITION");
    complete(work.directory, "TRACEABILITY_CHECK");
    work.artifact("tasks/tdd-plan.md");
    complete(work.directory, "TDD_PLAN");

    const controller = await WorkflowController({ directory: work.directory, client: {} });
    const beforeCommand = controller["command.execute.before"];

    await assert.doesNotReject(beforeCommand({ command: "plan" }));
    await assert.rejects(beforeCommand({ command: "build" }), /\/build is blocked while waiting/);
  } finally {
    work.cleanup();
  }
});
