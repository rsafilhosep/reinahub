import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { itemLookupKey } from "./item-normalizer.mjs";

const root = process.cwd();
const databaseRoot = path.join(root, "source", "web", "src", "reina-core", "database");
const generatedRoot = path.join(databaseRoot, "generated");
const dataSourcesGeneratedRoot = path.join(root, "source", "web", "src", "reina-core", "data-sources", "generated");

const sourceReport = readJson(path.join(dataSourcesGeneratedRoot, "tibiavault-npcs-normalized.json"));
const sourceCoverage = readJson(path.join(dataSourcesGeneratedRoot, "tibiavault-npcs-coverage.json"));
const localNpcs = readJson(path.join(generatedRoot, "npcs.json"), []);
const localTrades = readJson(path.join(generatedRoot, "npc-trades.json"), []);
const items = readJson(path.join(generatedRoot, "items.json"), []);
const supplementalItems = readJson(path.join(generatedRoot, "supplemental-items.json"), []);
const manualMappings = readJson(path.join(databaseRoot, "manual-mappings.json"), {});

const itemIndex = buildItemIndex([...items, ...supplementalItems]);
const localNpcByName = new Map(localNpcs.map((npc) => [itemLookupKey(npc.name), npc]));
const localTradeByKey = new Map(localTrades.map((trade) => [tradeKey(trade), trade]));
const generatedAt = new Date().toISOString();

const npcCandidates = [];
const tradeCandidates = [];
const unresolvedTrades = [];
const conflicts = [];

for (const sourceNpc of sourceReport.npcs ?? []) {
  const normalizedNpcName = itemLookupKey(sourceNpc.name);
  const localNpc = localNpcByName.get(normalizedNpcName);
  const npcCandidate = {
    name: sourceNpc.name,
    normalizedName: normalizedNpcName,
    city: sourceNpc.city ?? undefined,
    location: sourceNpc.location ?? undefined,
    roles: sourceNpc.roles ?? [],
    sourcePath: sourceNpc.sourceUrl,
    source: "tibiavault",
    sourceUrl: sourceNpc.sourceUrl,
    reviewStatus: localNpc ? "merge-candidate" : "new-candidate",
    localMatch: localNpc
      ? {
          name: localNpc.name,
          city: localNpc.city ?? null,
          sourcePath: localNpc.sourcePath ?? null
        }
      : null
  };

  npcCandidates.push(npcCandidate);
  collectTrades(sourceNpc, "itemsBought", "npcBuys");
  collectTrades(sourceNpc, "itemsSold", "npcSells");
}

const report = {
  generatedAt,
  source: "tibiavault",
  sourceUrl: sourceReport.sourceUrl,
  scriptUrl: sourceReport.scriptUrl,
  safety: "Review candidates only. This script does not overwrite npcs.json or npc-trades.json.",
  input: {
    normalizedReport: path.relative(root, path.join(dataSourcesGeneratedRoot, "tibiavault-npcs-normalized.json")),
    coverageReport: path.relative(root, path.join(dataSourcesGeneratedRoot, "tibiavault-npcs-coverage.json"))
  },
  totals: {
    sourceNpcs: sourceReport.totalNpcs ?? 0,
    npcCandidates: npcCandidates.length,
    newNpcCandidates: npcCandidates.filter((npc) => npc.reviewStatus === "new-candidate").length,
    mergeNpcCandidates: npcCandidates.filter((npc) => npc.reviewStatus === "merge-candidate").length,
    tradeCandidates: tradeCandidates.length,
    unresolvedTrades: unresolvedTrades.length,
    conflicts: conflicts.length,
    sourceCoverageTotals: sourceCoverage.totals ?? null
  },
  nextSteps: [
    "Review tibiavault-npc-promotion-conflicts.json.",
    "Review tibiavault-npc-promotion-unresolved-trades.json.",
    "Add aliases or supplemental items for unresolved trades when needed.",
    "Only after review, merge candidates into canonical NPC import flow."
  ]
};

mkdirSync(generatedRoot, { recursive: true });
writeJson("tibiavault-npc-candidates.json", npcCandidates.sort((a, b) => a.name.localeCompare(b.name)));
writeJson("tibiavault-npc-trade-candidates.json", dedupeTrades(tradeCandidates).sort(sortTrade));
writeJson("tibiavault-npc-promotion-unresolved-trades.json", dedupeTrades(unresolvedTrades).sort(sortTrade));
writeJson("tibiavault-npc-promotion-conflicts.json", conflicts.sort((a, b) => a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName)));
writeJson("tibiavault-npc-promotion-report.json", report);

console.log("TibiaVault NPC promotion candidates generated");
console.log(report.totals);

function collectTrades(sourceNpc, sourceField, tradeType) {
  const normalizedNpcName = itemLookupKey(sourceNpc.name);
  for (const row of sourceNpc[sourceField] ?? []) {
    const item = resolveItem(row.itemName);
    const base = {
      npcName: sourceNpc.name,
      normalizedNpcName,
      itemName: item?.name ?? row.itemName,
      tradeType,
      price: row.price,
      sourcePath: sourceNpc.sourceUrl,
      source: "tibiavault",
      sourceUrl: sourceNpc.sourceUrl,
      dataStatus: item ? "matched" : "unmatched",
      reviewStatus: item ? "candidate" : "manual-review-required"
    };

    const trade = {
      ...base,
      ...(item?.id ? { itemId: item.id } : {}),
      ...(item?.clientId ? { clientId: item.clientId } : {})
    };

    if (!item) {
      unresolvedTrades.push(trade);
      return;
    }

    const existing = localTradeByKey.get(tradeKey(trade));
    if (existing && existing.price !== trade.price) {
      conflicts.push({
        type: "price-conflict",
        npcName: trade.npcName,
        itemName: trade.itemName,
        tradeType: trade.tradeType,
        localPrice: existing.price,
        sourcePrice: trade.price,
        localSourcePath: existing.sourcePath,
        sourceUrl: trade.sourceUrl,
        suggestedClassification: "review-required"
      });
    }

    tradeCandidates.push({
      ...trade,
      localMatch: existing
        ? {
            price: existing.price,
            sourcePath: existing.sourcePath
          }
        : null,
      reviewStatus: existing ? "merge-candidate" : "new-candidate"
    });
  }
}

function buildItemIndex(rows) {
  const byId = new Map();
  const byClientId = new Map();
  const byName = new Map();

  for (const item of rows) {
    if (!byId.has(item.id)) byId.set(item.id, item);
    if (item.clientId && !byClientId.has(item.clientId)) byClientId.set(item.clientId, item);
    const key = itemLookupKey(item.name);
    if (!byName.has(key)) byName.set(key, item);
  }

  return { byId, byClientId, byName };
}

function resolveItem(itemName) {
  const normalizedName = itemLookupKey(itemName);
  const alias = manualMappings.itemNameAliases?.[normalizedName];
  return itemIndex.byName.get(normalizedName) ?? resolveManualTarget(alias) ?? null;
}

function resolveManualTarget(target) {
  if (!target) return null;
  if (typeof target === "number") return itemIndex.byId.get(target) ?? itemIndex.byClientId.get(target) ?? null;
  if (typeof target === "string") return itemIndex.byName.get(itemLookupKey(target)) ?? null;
  if (typeof target !== "object") return null;

  if (target.itemId) return itemIndex.byId.get(target.itemId) ?? null;
  if (target.clientId) return itemIndex.byClientId.get(target.clientId) ?? null;
  if (target.itemName) return itemIndex.byName.get(itemLookupKey(target.itemName)) ?? null;
  return null;
}

function tradeKey(trade) {
  const itemKey = trade.itemId ?? trade.clientId ?? itemLookupKey(trade.itemName);
  return `${itemLookupKey(trade.npcName)}:${trade.tradeType}:${itemKey}`;
}

function dedupeTrades(trades) {
  const byKey = new Map();
  for (const trade of trades) {
    const key = `${tradeKey(trade)}:${trade.price}`;
    if (!byKey.has(key)) byKey.set(key, trade);
  }
  return Array.from(byKey.values());
}

function sortTrade(a, b) {
  return a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName) || a.tradeType.localeCompare(b.tradeType);
}

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
