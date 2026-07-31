import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const checks = [
  ["database", "database:verify"],
  ["economy", "economy:verify"],
  ["data sources", "datasource:verify"],
  ["architecture", "architecture:verify"],
  ["assets", "assets:verify"],
  ["asset git report", "assets:git-report"],
  ["imbuements", "imbuements:verify"],
  ["equipment scan", "equipment:scan-repository"],
  ["build", "build"]
];
const npmCli = getNpmCliPath();

const startedAt = Date.now();

console.log("ReinaHub full verification started");
console.log(`Checks: ${checks.map(([name]) => name).join(" -> ")}`);

for (const [name, scriptName] of checks) {
  const checkStartedAt = Date.now();
  console.log(`\n[verify:all] Running ${name}...`);

  const result = spawnSync(process.execPath, [npmCli, "run", scriptName], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      REINAHUB_VERIFY_READONLY: "1"
    },
    stdio: "inherit"
  });

  const elapsedSeconds = ((Date.now() - checkStartedAt) / 1000).toFixed(1);

  if (result.status !== 0) {
    console.error(`\n[verify:all] Failed at ${name} after ${elapsedSeconds}s.`);
    process.exit(result.status ?? 1);
  }

  console.log(`[verify:all] ${name} passed in ${elapsedSeconds}s.`);
}

const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nReinaHub full verification passed in ${totalSeconds}s.`);

function getNpmCliPath() {
  if (process.env.npm_execpath && existsSync(process.env.npm_execpath)) {
    return process.env.npm_execpath;
  }

  if (process.platform === "win32") {
    const windowsDefault = "C:\\Program Files\\nodejs\\node_modules\\npm\\bin\\npm-cli.js";
    if (existsSync(windowsDefault)) return windowsDefault;
  }

  return "npm";
}
