import { tool, type Plugin } from "@opencode-ai/plugin";
import { relative, resolve } from "node:path";
import {
  approveGate,
  completeStage,
  continueWorkflow,
  currentStageDefinition,
  inspectExistingWorkflow,
  initializeWorkflow,
  readWorkflow,
  recordDispatch,
  rejectGate,
  requestHumanReview,
  skipStage,
  startWorkflow,
  workflowStatus,
} from "../workflow/engine.mjs";
import { detectProjectFamily, initializeProjectFamily, supportedGameEngines } from "../workflow/family.mjs";

const managedCommands = new Set([
  "workflow-init", "workflow-inspect", "workflow-skip", "start", "workflow-status", "approve", "approve-design", "approve-plan",
  "design", "plan", "build", "review", "complete", "full/design",
]);
const sourceMutationTools = new Set(["write", "edit", "patch", "apply_patch", "bash", "shell"]);
const pathArgumentNames = new Set([
  "path", "file", "filePath", "file_path", "filepath", "filename", "file_name", "destination", "target",
]);

function json(value: unknown) {
  return JSON.stringify(value, null, 2);
}

function isWithinWorkflow(directory: string, candidate: string) {
  const absolute = resolve(directory, candidate);
  const workflowRoot = resolve(directory, ".workflow");
  const rel = relative(workflowRoot, absolute);
  return rel === "" || (!rel.startsWith("..") && !rel.includes("../"));
}

function pathsFromArgs(value: unknown, key?: string): string[] {
  if (typeof value === "string") {
    if (key && pathArgumentNames.has(key)) return [value];
    const controllerPatchPaths = [
      ...Array.from(value.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm), (match) => match[1].trim()),
      ...Array.from(value.matchAll(/^\+\+\+ (?:[ab]\/)?(.+)$/gm), (match) => match[1].trim()),
    ];
    return controllerPatchPaths.filter((candidate) => candidate !== "/dev/null");
  }
  if (!value || typeof value !== "object") return [];
  if (Array.isArray(value)) return value.flatMap((item) => pathsFromArgs(item));
  return Object.entries(value).flatMap(([entryKey, entryValue]) => pathsFromArgs(entryValue, entryKey));
}

function assertMutationAllowed(directory: string, toolName: string, args: unknown) {
  if (!sourceMutationTools.has(toolName)) return;
  let state;
  try {
    state = readWorkflow(directory);
  } catch {
    return;
  }
  const paths = pathsFromArgs(args);
  if (paths.some((candidate) => resolve(directory, candidate) === resolve(directory, ".workflow/state.json"))) {
    throw new Error("Direct edits to .workflow/state.json are blocked. Advance workflow state only through workflow controller tools.");
  }
  const implementationOpen = state.workflow.profile === "full"
    ? ["approved", "satisfied"].includes(state.gates.implementation_plan.status)
    : ["BUILD", "FIX"].includes(state.stage);
  if (implementationOpen) return;
  if (toolName === "bash" || toolName === "shell") {
    throw new Error("Shell execution is blocked until the implementation-plan human gate is approved. Use native read tools and write only workflow artifacts.");
  }
  if (!paths.length || paths.some((candidate) => !isWithinWorkflow(directory, candidate))) {
    throw new Error("Source modification is blocked until the implementation-plan human gate is approved. Only .workflow/** artifacts may be edited.");
  }
}

function workerForStage(state: ReturnType<typeof readWorkflow>) {
  const stage = state.stage;
  if (state.workflow.profile === "prototype" && ["GOAL", "SUCCESS_CRITERIA", "CONSTRAINTS", "BUILD"].includes(stage)) return "prototype-builder";
  if (["FEATURE_DEFINITION", "USER_FLOW", "OPEN_DESIGN", "OPEN_DESIGN_LITE"].includes(stage)) return "product-designer";
  if (stage === "ARCHITECTURE") return "architect";
  if (stage === "PROTOTYPE_REVIEW") return "reviewer";
  if (["TASK_REVIEW", "REGRESSION_REVIEW"].includes(stage)) return "reviewer";
  if (["INTEGRATION_REVIEW", "COMPLETION_GATE", "EVALUATE", "DECISION"].includes(stage)) return "verifier";
  return "build";
}

function skillForStage(state: ReturnType<typeof readWorkflow>) {
  const stage = state.stage;
  if (["FEATURE_DEFINITION", "USER_FLOW"].includes(stage)) return "product-design";
  if (["OPEN_DESIGN", "OPEN_DESIGN_LITE"].includes(stage)) return "open-design";
  if (stage === "ARCHITECTURE") return "architecture";
  if (["TASK_DECOMPOSITION", "TASK_DEFINITION", "LIGHT_PLAN"].includes(stage)) return "task-planning";
  if (stage === "TRACEABILITY_CHECK") return "traceability";
  if (stage === "TDD_PLAN") return "tdd";
  if (stage === "BUILD" && state.workflow.profile !== "prototype") return "tdd-build";
  if (stage === "FIX") return "tdd-build";
  if (["TASK_REVIEW", "REGRESSION_REVIEW"].includes(stage)) return "independent-review";
  if (["INTEGRATION_REVIEW", "COMPLETION_GATE"].includes(stage)) return "final-verification";
  if (["BUG_REPORT", "REPRODUCE", "ROOT_CAUSE", "AFFECTED_SCOPE", "REGRESSION_TEST", "DOCUMENTATION_CHECK"].includes(stage)) return "bug-analysis";
  if (["CONSTRAINTS", "EVALUATE", "DECISION"].includes(stage)) return "prototype-evaluation";
  return null;
}

function ponytailDirective(state: ReturnType<typeof readWorkflow>) {
  const current = currentStageDefinition(state);
  const mode = current?.ponytail ?? "off";
  const shared = "Do not change the global /ponytail mode; this workflow applies Ponytail only for this worker stage.";
  if (mode === "off") {
    return `Ponytail stage mode: OFF. Preserve the approved product/design scope without applying a simplification agenda. ${shared}`;
  }
  const intensity = mode === "lite"
    ? "Use Ponytail lite: implement the requested stage faithfully, and name a simpler viable alternative only when it helps the decision."
    : "Use Ponytail full: after understanding the task, apply YAGNI, reuse existing patterns, prefer stdlib/native capabilities, avoid new dependencies and abstractions, and make the smallest correct change.";
  const review = current?.ponytail_review
    ? " Before completing this stage, perform the current-diff checks from /ponytail-review and record its findings or 'Lean already. Ship.' in .workflow/reviews/ponytail-review.md."
    : "";
  const audit = current?.ponytail_audit === "optional"
    ? " Do not run /ponytail-audit by default; recommend it only when the integration review shows repository-wide duplication or systemic over-engineering."
    : "";
  return `Ponytail stage mode: ${mode.toUpperCase()}. ${intensity}${review}${audit} ${shared}`;
}

function stagePrompt(state: ReturnType<typeof readWorkflow>) {
  const stage = state.stage;
  const skill = skillForStage(state);
  let runbook = "Complete only the current stage and call workflow_complete_stage. The controller dispatches the next non-human stage automatically; do not call workflow_dispatch. Stop after the completion call.";
  if (state.workflow.profile === "prototype" && stage === "BUILD") {
    runbook = "Build only the minimum prototype needed to test the hypothesis. Record what was built, launch/review instructions, known gaps, and verification evidence in .workflow/prototypes/build.md. Call workflow_complete_stage for BUILD; the controller starts the independent prototype review automatically. Do not call workflow_dispatch.";
  } else if (state.workflow.profile === "prototype" && stage === "PROTOTYPE_REVIEW") {
    runbook = "Independently inspect the prototype build artifact, current source, launch instructions, and available checks. Write .workflow/reviews/prototype-review.md. If a concrete human decision is required, call workflow_request_human_review and stop. Otherwise call workflow_complete_stage for PROTOTYPE_REVIEW; the controller starts evaluation automatically. Do not call workflow_dispatch.";
  }
  return [
    `You are the dedicated worker for managed workflow stage ${stage}.`,
    `Workflow profile: ${state.workflow.profile}.`,
    `Goal: ${state.workflow.goal ?? "No goal recorded"}.`,
    ponytailDirective(state),
    state.import?.blocker ? `Brownfield import blocker: ${JSON.stringify(state.import.blocker)}. Repair or supply evidence for this stage; do not bypass it.` : "No brownfield import blocker is active.",
    "Read AGENTS.md, workflow state, and only the artifacts relevant to this stage.",
    skill ? `Load the ${skill} skill before taking action.` : "Follow project rules and stage permissions.",
    "Do not edit .workflow/state.json directly.",
    runbook,
    "If a human decision is required, record it in the appropriate artifact and stop without advancing state.",
  ].join("\n");
}

async function dispatchCurrentStage(client: Parameters<Plugin>[0]["client"], directory: string) {
  const state = readWorkflow(directory);
  if (state.workflow.status !== "running") throw new Error(`Cannot dispatch while workflow status is ${state.workflow.status}.`);
  const agent = workerForStage(state);
  const created = await client.session.create({
    query: { directory },
    body: { title: `${state.workflow.profile.toUpperCase()} - ${state.stage}` },
  });
  if (created.error || !created.data) throw new Error(`Could not create workflow worker session: ${JSON.stringify(created.error)}`);
  const prompted = await client.session.promptAsync({
    path: { id: created.data.id },
    query: { directory },
    body: { agent, parts: [{ type: "text", text: stagePrompt(state) }] },
  });
  if (prompted.error) throw new Error(`Could not prompt workflow worker session: ${JSON.stringify(prompted.error)}`);
  const ponytail_mode = currentStageDefinition(state)?.ponytail ?? "off";
  recordDispatch(directory, { session_id: created.data.id, agent, stage: state.stage, ponytail_mode });
  return { session_id: created.data.id, agent, stage: state.stage, ponytail_mode, status: "started" };
}

const WorkflowController: Plugin = async ({ directory, client }) => ({
  tool: {
    workflow_family_detect: tool({
      description: "Detect whether the current project is software/app or game without changing files.",
      args: {},
      async execute(_args, context) {
        return json(detectProjectFamily(context.directory));
      },
    }),
    workflow_family_init: tool({
      description: "Configure the current project for the managed software workflow or the user-driven game studio workflow.",
      args: {
        family: tool.schema.enum(["software", "game"]),
        engine: tool.schema.enum(supportedGameEngines).optional(),
        allowSwitch: tool.schema.boolean().optional(),
      },
      async execute(args, context) {
        const family = initializeProjectFamily(context.directory, args);
        const workflow = args.family === "software" ? initializeWorkflow(context.directory) : null;
        return json({ family, workflow });
      },
    }),
    workflow_init: tool({
      description: "Initialize or validate project-local .workflow state and artifact directories.",
      args: {},
      async execute(_args, context) {
        return json(initializeWorkflow(context.directory));
      },
    }),
    workflow_start: tool({
      description: "Start a managed greenfield or brownfield workflow. Optional from imports and validates earlier artifacts without bypassing human gates.",
      args: {
        profile: tool.schema.enum(["full", "quick", "bugfix", "prototype"]),
        goal: tool.schema.string().min(1),
        reset: tool.schema.boolean().optional(),
        dispatch: tool.schema.boolean().optional(),
        from: tool.schema.enum(["start", "auto", "design", "architecture", "planning", "build", "review"]).optional(),
        verifiedGates: tool.schema.array(tool.schema.enum(["product_design", "implementation_plan"])).optional(),
        sources: tool.schema.array(tool.schema.object({
          stage: tool.schema.string().min(1),
          source: tool.schema.string().min(1),
        })).optional(),
      },
      async execute(args, context) {
        const state = startWorkflow(context.directory, args);
        const dispatch = args.dispatch && state.workflow.status === "running"
          ? await dispatchCurrentStage(client, context.directory)
          : null;
        return json({ state, dispatch });
      },
    }),
    workflow_inspect: tool({
      description: "Inspect existing managed and conventional artifacts, implementation coverage, and a recommended brownfield start point without changing workflow state.",
      args: {
        profile: tool.schema.enum(["full", "quick", "bugfix", "prototype"]),
        sources: tool.schema.array(tool.schema.object({
          stage: tool.schema.string().min(1),
          source: tool.schema.string().min(1),
        })).optional(),
      },
      async execute(args, context) {
        return json(inspectExistingWorkflow(context.directory, args));
      },
    }),
    workflow_status: tool({
      description: "Read the current managed workflow status, active stage, gates, and missing artifacts.",
      args: {},
      async execute(_args, context) {
        return json(workflowStatus(context.directory));
      },
    }),
    workflow_approve: tool({
      description: "Record an explicit human approval for the active product-design or implementation-plan gate.",
      args: {
        gate: tool.schema.enum(["product_design", "implementation_plan"]),
        dispatch: tool.schema.boolean().optional(),
      },
      async execute(args, context) {
        const state = approveGate(context.directory, args);
        const dispatch = args.dispatch ? await dispatchCurrentStage(client, context.directory) : null;
        return json({ state, dispatch });
      },
    }),
    workflow_reject: tool({
      description: "Reject the active human gate with a reason and return to its revision stage.",
      args: {
        gate: tool.schema.enum(["product_design", "implementation_plan"]),
        reason: tool.schema.string().min(1),
      },
      async execute(args, context) {
        return json(rejectGate(context.directory, args));
      },
    }),
    workflow_continue: tool({
      description: "Resume or complete the current non-human stage, then automatically dispatch the active worker.",
      args: { summary: tool.schema.string().optional() },
      async execute(args, context) {
        const state = continueWorkflow(context.directory, args);
        const dispatch = state.workflow.status === "running"
          ? await dispatchCurrentStage(client, context.directory)
          : null;
        return json({ state, dispatch });
      },
    }),
    workflow_request_human_review: tool({
      description: "Stop the running workflow for a concrete human decision when scope, safety, data, or architecture requires it.",
      args: { reason: tool.schema.string().min(1) },
      async execute(args, context) {
        return json(requestHumanReview(context.directory, args));
      },
    }),
    workflow_skip_stage: tool({
      description: "Mark the current non-gate stage SKIPPED only after explicit user confirmation, preserving a concrete reason in workflow history.",
      args: {
        stage: tool.schema.string().min(1),
        reason: tool.schema.string().min(1),
        confirmedByUser: tool.schema.boolean(),
      },
      async execute(args, context) {
        const state = skipStage(context.directory, args);
        const dispatch = state.workflow.status === "running"
          ? await dispatchCurrentStage(client, context.directory)
          : null;
        return json({ state, dispatch });
      },
    }),
    workflow_dispatch: tool({
      description: "Create a separate OMO-backed OpenCode session for the current running workflow stage.",
      args: {},
      async execute(_args, context) {
        return json(await dispatchCurrentStage(client, context.directory));
      },
    }),
    workflow_complete_stage: tool({
      description: "Validate and complete one exact current stage, then automatically dispatch the next non-human stage.",
      args: { stage: tool.schema.string().min(1), summary: tool.schema.string().optional() },
      async execute(args, context) {
        const state = completeStage(context.directory, args);
        const dispatch = state.workflow.status === "running"
          ? await dispatchCurrentStage(client, context.directory)
          : null;
        return json({ state, dispatch });
      },
    }),
  },
  "command.execute.before": async (input) => {
    if (input.command === "workflow-init") {
      initializeWorkflow(directory);
      return;
    }
    if (!managedCommands.has(input.command) || ["workflow-inspect", "workflow-status", "start"].includes(input.command)) return;
    const state = readWorkflow(directory);
    const allowedWhileWaiting = new Set(["approve", "approve-design", "approve-plan"]);
    if (state.stage === "PRODUCT_REVIEW") {
      allowedWhileWaiting.add("design");
      allowedWhileWaiting.add("full/design");
    }
    if (state.stage === "IMPLEMENTATION_REVIEW") {
      allowedWhileWaiting.add("plan");
    }
    if (state.workflow.status === "waiting_human" && !allowedWhileWaiting.has(input.command)) {
      throw new Error(`/${input.command} is blocked while waiting for explicit human approval at ${state.stage}.`);
    }
  },
  "tool.execute.before": async (input, output) => {
    assertMutationAllowed(directory, input.tool, output.args);
  },
});

export default WorkflowController;
