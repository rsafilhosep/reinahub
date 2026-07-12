import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importNpcTrades } from "./npc-trades-importer.mjs";

const databaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(databaseRoot, "generated");
const root = process.cwd();
const defaultNpcPath = path.join(root, "files_repository", "06_30_2026", "crystalserver-main", "data-global", "npc");
const args = parseArgs(process.argv.slice(2));
const sourcePath = args.npcs ?? defaultNpcPath;
const items = readJson(path.join(generatedRoot, "items.json"));
const supplementalItems = readJson(path.join(generatedRoot, "supplemental-items.json"), []);
const manualMappings = readJson(path.join(databaseRoot, "manual-mappings.json"), {});

const result = importNpcTrades(sourcePath, [...items, ...supplementalItems], manualMappings);

mkdirSync(generatedRoot, { recursive: true });
writeJson("npcs.json", result.npcs);
writeJson("npc-trades.json", result.trades);
writeJson("unresolved-npc-trades.json", result.unresolvedTrades);
writeJson("unresolved-npc-trades-review.json", result.report.unresolvedReview);
writeJson("npc-trades-report.json", {
  generatedAt: new Date().toISOString(),
  safety: "Lua files are read as text only. No Lua code is executed.",
  ...result.report
});

console.log("NPC trades import complete");
console.log({
  sourcePath: path.relative(root, sourcePath),
  npcs: result.npcs.length,
  trades: result.trades.length,
  unresolvedTrades: result.unresolvedTrades.length,
  tradeTypes: result.report.tradeTypes
});

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    if (fallback !== null) return fallback;
    throw new Error(`Unable to read JSON file: ${filePath}`);
  }
}

function writeJson(file, data) {
  writeFileSync(path.join(generatedRoot, file), `${JSON.stringify(data, null, 2)}\n`);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    parsed[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
