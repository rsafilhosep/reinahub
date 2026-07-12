import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { itemLookupKey } from "./item-normalizer.mjs";

const root = process.cwd();
const generatedRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");

const localTrades = readJson("npc-trades.json", []);
const tibiavaultTrades = readJson("tibiavault-npc-trade-candidates.json", []);
const reviewReport = readJson("tibiavault-npc-review-report.json", { conflicts: [], policySuggestion: null });

const conflictKeys = new Map((reviewReport.conflicts ?? []).map((conflict) => [sourceNameKey(conflict), conflict]));
const sources = [
  {
    id: "otserver-local",
    label: "OTServer Local",
    type: "local",
    priority: 10,
    activeByDefault: true,
    description: "Precos extraidos dos arquivos locais do OTServer em files_repository."
  },
  {
    id: "tibiavault-reference",
    label: "TibiaVault Reference",
    type: "external-reference",
    priority: 20,
    activeByDefault: false,
    description: "Precos de referencia capturados do TibiaVault para revisao e comparacao."
  }
];

const priceRows = [];

for (const trade of localTrades) {
  priceRows.push({
    sourceId: "otserver-local",
    npcName: trade.npcName,
    normalizedNpcName: trade.normalizedNpcName ?? itemLookupKey(trade.npcName),
    itemId: trade.itemId ?? null,
    clientId: trade.clientId ?? null,
    itemName: trade.itemName,
    normalizedItemName: itemLookupKey(trade.itemName),
    tradeType: trade.tradeType,
    price: trade.price,
    sourcePath: trade.sourcePath,
    sourceUrl: null,
    confidence: "high",
    status: "active"
  });
}

for (const trade of tibiavaultTrades) {
  const conflict = conflictKeys.get(sourceNameKey(trade));
  priceRows.push({
    sourceId: "tibiavault-reference",
    npcName: trade.npcName,
    normalizedNpcName: trade.normalizedNpcName ?? itemLookupKey(trade.npcName),
    itemId: trade.itemId ?? null,
    clientId: trade.clientId ?? null,
    itemName: trade.itemName,
    normalizedItemName: itemLookupKey(trade.itemName),
    tradeType: trade.tradeType,
    price: trade.price,
    sourcePath: trade.sourcePath,
    sourceUrl: trade.sourceUrl ?? trade.sourcePath,
    confidence: conflict ? "medium" : "high",
    status: conflict ? "conflict-review" : trade.reviewStatus ?? "reference",
    conflict: conflict
      ? {
          localPrice: conflict.localPrice,
          sourcePrice: conflict.sourcePrice,
          severity: conflict.severity,
          ratio: conflict.ratio,
          likelyCause: conflict.likelyCause
        }
      : null
  });
}

const grouped = groupPriceRows(priceRows);
const report = {
  generatedAt: new Date().toISOString(),
  safety: "NPC trade price source layer only. Canonical npc-trades.json remains unchanged.",
  sources,
  totals: {
    localRows: localTrades.length,
    tibiavaultRows: tibiavaultTrades.length,
    totalRows: priceRows.length,
    groupedTradeKeys: grouped.length,
    conflicts: priceRows.filter((row) => row.status === "conflict-review").length,
    activeByDefaultRows: priceRows.filter((row) => sources.find((source) => source.id === row.sourceId)?.activeByDefault).length
  },
  policy: reviewReport.policySuggestion ?? {
    defaultLocalPriceSource: "otserver-local",
    externalPriceSource: "tibiavault-reference"
  }
};

writeJson("npc-trade-price-sources.json", {
  generatedAt: report.generatedAt,
  sources,
  prices: priceRows.sort(sortPriceRow)
});
writeJson("npc-trade-price-sources-grouped.json", {
  generatedAt: report.generatedAt,
  groups: grouped
});
writeJson("npc-trade-price-sources-report.json", report);

console.log("NPC trade price sources generated");
console.log(report.totals);

function groupPriceRows(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = sourceKey(row);
    const group = groups.get(key) ?? {
      npcName: row.npcName,
      normalizedNpcName: row.normalizedNpcName,
      itemId: row.itemId,
      clientId: row.clientId,
      itemName: row.itemName,
      normalizedItemName: row.normalizedItemName,
      tradeType: row.tradeType,
      prices: []
    };
    group.prices.push({
      sourceId: row.sourceId,
      price: row.price,
      confidence: row.confidence,
      status: row.status,
      sourcePath: row.sourcePath,
      sourceUrl: row.sourceUrl,
      conflict: row.conflict
    });
    groups.set(key, group);
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      prices: group.prices.sort((a, b) => a.sourceId.localeCompare(b.sourceId)),
      hasConflict: group.prices.some((price) => price.status === "conflict-review"),
      activePrice: group.prices.find((price) => price.sourceId === "otserver-local")?.price ?? group.prices[0]?.price ?? null
    }))
    .sort((a, b) => a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName) || a.tradeType.localeCompare(b.tradeType));
}

function sourceKey(row) {
  const itemKey = row.itemId ?? row.clientId ?? itemLookupKey(row.itemName);
  return `${itemLookupKey(row.npcName)}:${row.tradeType}:${itemKey}`;
}

function sourceNameKey(row) {
  return `${itemLookupKey(row.npcName)}:${row.tradeType}:${itemLookupKey(row.itemName)}`;
}

function sortPriceRow(a, b) {
  return a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName) || a.tradeType.localeCompare(b.tradeType) || a.sourceId.localeCompare(b.sourceId);
}

function readJson(fileName, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(generatedRoot, fileName), "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(fileName, data) {
  writeFileSync(path.join(generatedRoot, fileName), `${JSON.stringify(data, null, 2)}\n`);
}
