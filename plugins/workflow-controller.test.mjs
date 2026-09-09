import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import WorkflowController, { modelForStage } from "./workflow-controller.ts";
import { approveGate, completeStage, readWorkflow, startWorkflow } from "../workflow/engine.mjs";

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "opencode-workflow-controller-"));
  return {
    directory,
    artifact(relativePath, content = "evidence\n") {
      const state = readWorkflow(directory);
      const root = state.workflow.artifact_root
        ? join(directory, ".workflow", state.workflow.artifact_root)
        : join(directory, ".workflow");
      const path = join(root, relativePath);
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

test("completing a prototype stage dispatches its independent review and evaluation workers", async () => {
  const work = fixture();
  try {
    startWorkflow(work.directory, { profile: "prototype", goal: "Prototype dispatch test" });
    work.artifact("requirements/feature-spec.md");
    complete(work.directory, "GOAL");
    work.artifact("requirements/success-criteria.md");
    complete(work.directory, "SUCCESS_CRITERIA");
    work.artifact("prototypes/constraints.md");
    complete(work.directory, "CONSTRAINTS");
    work.artifact("design/user-flow.md");
    complete(work.directory, "USER_FLOW");
    work.artifact("design/DESIGN.md");
    work.artifact("design/wireframes/prototype.md");
    work.artifact("design/screens/prototype.md");
    complete(work.directory, "OPEN_DESIGN");
    work.artifact("prototypes/build.md");

    const dispatched = [];
    let session = 0;
    const client = {
      session: {
        create: async () => ({ data: { id: `worker-${++session}` } }),
        promptAsync: async (request) => {
          dispatched.push(request.body.agent);
          return {};
        },
      },
    };
    const controller = await WorkflowController({ directory: work.directory, client });
    const completeTool = controller.tool.workflow_complete_stage;

    await completeTool.execute({ stage: "BUILD" }, { directory: work.directory });
    assert.deepEqual(dispatched, ["reviewer"]);

    work.artifact("reviews/prototype-review.md");
    await completeTool.execute({ stage: "PROTOTYPE_REVIEW" }, { directory: work.directory });
    assert.deepEqual(dispatched, ["reviewer", "verifier"]);
  } finally {
    work.cleanup();
  }
});

test("prototype workflow starts with the dedicated Qwen builder agent", async () => {
  const work = fixture();
  try {
    const dispatched = [];
    const client = {
      session: {
        create: async () => ({ data: { id: "prototype-builder-session" } }),
        promptAsync: async (request) => {
          dispatched.push({ agent: request.body.agent, model: request.body.model });
          return {};
        },
      },
    };
    const controller = await WorkflowController({ directory: work.directory, client });
    const startTool = controller.tool.workflow_start;

    await startTool.execute({ profile: "prototype", goal: "Qwen builder selection", dispatch: true }, { directory: work.directory });
    assert.deepEqual(dispatched, [{
      agent: "prototype-builder",
      model: { providerID: "opencode-go", modelID: "qwen3.8-flash" },
    }]);
  } finally {
    work.cleanup();
  }
});

test("workflow stages select an explicit model instead of OMO defaults", () => {
  const work = fixture();
  try {
    const full = startWorkflow(work.directory, { profile: "full", goal: "Explicit model test" });
    assert.deepEqual(modelForStage(full), { providerID: "openai", modelID: "gpt-5.6-terra" });
    assert.deepEqual(modelForStage({ ...full, stage: "BUILD" }), { providerID: "opencode-go", modelID: "qwen3.8-flash" });
    assert.deepEqual(modelForStage({ ...full, stage: "TDD_PLAN" }), { providerID: "openai", modelID: "gpt-5.6-terra" });

    const quick = startWorkflow(work.directory, { profile: "quick", goal: "Explicit model test", reset: true });
    assert.deepEqual(modelForStage(quick), { providerID: "opencode-go", modelID: "glm-5.3-flash" });
  } finally {
    work.cleanup();
  }
});
