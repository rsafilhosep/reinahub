import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const reports = [
  ["data sources", "datasource:verify"],
  ["assets", "assets:verify"],
  ["asset git report", "assets:git-report"],
  ["imbuements", "imbuements:verify"],
  ["equipment scan", "equipment:scan-repository"],
  ["lua repository scan", "repository:scan-lua"]
];

const npmCli = getNpmCliPath();
const startedAt = Date.now();

console.log("ReinaHub generated reports refresh started");
console.log(`Reports: ${reports.map(([name]) => name).join(" -> ")}`);

for (const [name, scriptName] of reports) {
  const reportStartedAt = Date.now();
  console.log(`\n[reports:refresh] Running ${name}...`);

  const result = spawnSync(process.execPath, [npmCli, "run", scriptName], {
    cwd: process.cwd(),
    stdio: "inherit"
  });

  const elapsedSeconds = ((Date.now() - reportStartedAt) / 1000).toFixed(1);

  if (result.status !== 0) {
    console.error(`\n[reports:refresh] Failed at ${name} after ${elapsedSeconds}s.`);
    process.exit(result.status ?? 1);
  }

  console.log(`[reports:refresh] ${name} refreshed in ${elapsedSeconds}s.`);
}

const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
console.log(`\nReinaHub generated reports refreshed in ${totalSeconds}s.`);

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
