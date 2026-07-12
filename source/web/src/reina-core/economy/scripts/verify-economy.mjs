import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const sampleServer = {
  id: "verify-server",
  nome: "Verify",
  plataforma: "Tibia Global",
  mundo: "Verify",
  tipo: "global",
  moeda: "Tibia Coin",
  lote: 25,
  gcPorMoeda: 40000,
  loteVenda: 4.8,
  loteCompra: 5.54
};

const root = process.cwd();
const architectureIssues = [];

function premiumToBrl(server, premium, side = "venda") {
  const unit = side === "venda" ? server.loteVenda / server.lote : server.loteCompra / server.lote;
  return premium * unit;
}

function goldToPremium(server, gold) {
  return server.gcPorMoeda > 0 ? gold / server.gcPorMoeda : 0;
}

function goldToBrl(server, gold, side = "venda") {
  return premiumToBrl(server, goldToPremium(server, gold), side);
}

const checks = [];

function check(name, actual, expected) {
  const diff = Math.abs(actual - expected);
  checks.push({
    name,
    actual,
    expected,
    ok: diff < 0.000001,
    diff
  });
}

const gold = 1000000;
const premium = 25;
const stashTotalGold = 3 * 50000;
const marketBestGold = 100 * 130 * 0.95;
const huntBalance = 11699;
const premiumGoalMissing = 250 - 120;
const liveGoalMissing = 390 - 120;

check("gold to premium", goldToPremium(sampleServer, gold), 25);
check("premium venda to brl", premiumToBrl(sampleServer, premium, "venda"), 4.8);
check("premium compra to brl", premiumToBrl(sampleServer, premium, "compra"), 5.54);
check("stash total premium", goldToPremium(sampleServer, stashTotalGold), stashTotalGold / sampleServer.gcPorMoeda);
check("stash total brl venda", goldToBrl(sampleServer, stashTotalGold, "venda"), premiumToBrl(sampleServer, stashTotalGold / sampleServer.gcPorMoeda, "venda"));
check("market best premium", goldToPremium(sampleServer, marketBestGold), marketBestGold / sampleServer.gcPorMoeda);
check("hunt balance premium", goldToPremium(sampleServer, huntBalance), huntBalance / sampleServer.gcPorMoeda);
check("premium goal missing gold", premiumGoalMissing * sampleServer.gcPorMoeda, 5200000);
check("premium goal missing brl venda", premiumToBrl(sampleServer, premiumGoalMissing, "venda"), 24.96);
check("live goal missing gold", liveGoalMissing * sampleServer.gcPorMoeda, 10800000);
check("live goal missing brl venda", premiumToBrl(sampleServer, liveGoalMissing, "venda"), 51.84);

const failed = checks.filter((row) => !row.ok);

verifyActiveServerWrites();

const report = {
  generatedAt: new Date().toISOString(),
  server: sampleServer,
  totalChecks: checks.length,
  failedChecks: failed.length,
  architectureIssues,
  checks
};

console.log(JSON.stringify(report, null, 2));

if (failed.length || architectureIssues.length) {
  process.exitCode = 1;
}

function verifyActiveServerWrites() {
  const allowedFiles = new Set([
    normalizePath(path.join("services", "quote-service.ts")),
    normalizePath(path.join("source", "web", "src", "reina-core", "economy", "reina-economy-service.ts"))
  ]);

  for (const file of listSourceFiles(["app", "components", "services", path.join("source", "web", "src")])) {
    const rel = normalizePath(path.relative(root, file));
    if (allowedFiles.has(rel)) continue;
    const content = readFileSync(file, "utf8");
    if (content.includes("setActiveServerId(")) {
      architectureIssues.push({
        rule: "active-server-writes",
        file: rel,
        message: "Use ReinaEconomyService.setActiveServer so the active profile and active quote stay synchronized."
      });
    }
  }
}

function listSourceFiles(relativeRoots) {
  const output = [];
  for (const relativeRoot of relativeRoots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!exists(absoluteRoot)) continue;
    walk(absoluteRoot, output);
  }
  return output.filter((file) => /\.(ts|tsx)$/.test(file));
}

function walk(current, output) {
  const stats = statSync(current);
  if (stats.isFile()) {
    output.push(current);
    return;
  }

  for (const entry of readdirSync(current)) {
    if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
    walk(path.join(current, entry), output);
  }
}

function exists(filePath) {
  try {
    statSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}
