#!/usr/bin/env node

import { fileURLToPath } from "node:url";
import { initializeWorkflow } from "../workflow/engine.mjs";

export { initializeWorkflow };

const invokedPath = process.argv[1] ? fileURLToPath(import.meta.url) === process.argv[1] : false;
if (invokedPath) {
  const result = initializeWorkflow();
  console.log(`workflow root: ${result.root}`);
  console.log(`state.json: ${result.state}`);
  console.log(`traceability.json: ${result.traceability}`);
}
