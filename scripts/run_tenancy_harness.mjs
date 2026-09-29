#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("=================================================");
console.log(" FinPath B05 Tenancy & Auth Boundary Harness");
console.log(" Persistence: Disposable In-Memory SQLite (D1)");
console.log(" Mode: Credential-Free / CI-Safe");
console.log("=================================================\n");

const testFiles = [
  "src/test/d1TestHarness.test.ts",
  "src/clerkAuthValidation.test.ts",
  "src/tenancyAuthHarness.test.ts"
];

const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const child = spawn(npxCmd, ["vitest", "run", ...testFiles], {
  cwd: rootDir,
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "test"
  }
});

child.on("close", (code) => {
  if (code === 0) {
    console.log("\n[PASS] All B05 Tenancy and Auth Boundary tests passed successfully.");
    process.exit(0);
  } else {
    console.error(`\n[FAIL] B05 Tenancy tests failed with exit code ${code}.`);
    process.exit(code ?? 1);
  }
});
