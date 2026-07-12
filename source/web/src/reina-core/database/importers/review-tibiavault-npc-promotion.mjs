import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { itemLookupKey } from "./item-normalizer.mjs";

const root = process.cwd();
const databaseGeneratedRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");

const conflicts = readJson("tibiavault-npc-promotion-conflicts.json", []);
const unresolvedTrades = readJson("tibiavault-npc-promotion-unresolved-trades.json", []);
const items = readJson("items.json", []);
const supplementalItems = readJson("supplemental-items.json", []);
const itemRows = [...items, ...supplementalItems];

const reviewedConflicts = conflicts.map(classifyConflict).sort(sortReviewedConflict);
const reviewedUnresolved = unresolvedTrades.map(reviewUnresolvedTrade);
const mappingCandidates = reviewedUnresolved
  .filter((row) => row.suggestedAlias)
  .map((row) => ({
    sourceItemName: row.itemName,
    normalizedSourceItemName: row.normalizedItemName,
    suggestedAlias: row.suggestedAlias,
    confidence: row.suggestionConfidence,
    reason: row.suggestionReason,
    reviewStatus: "manual-review-required"
  }));

const report = {
  generatedAt: new Date().toISOString(),
  source: "tibiavault",
  safety: "Review report only. No mappings or canonical database files are changed.",
  totals: {
    conflicts: reviewedConflicts.length,
    high: reviewedConflicts.filter((row) => row.severity === "high").length,
    medium: reviewedConflicts.filter((row) => row.severity === "medium").length,
    low: reviewedConflicts.filter((row) => row.severity === "low").length,
    unresolvedTrades: reviewedUnresolved.length,
    mappingCandidates: mappingCandidates.length
  },
  policySuggestion: {
    defaultLocalPriceSource: "otserver-local",
    externalPriceSource: "tibiavault-reference",
    note: "Keep local OTServer prices as active source for current tools. Use TibiaVault conflicts as review/reference data until a per-source price selector exists."
  },
  conflicts: reviewedConflicts,
  unresolvedTrades: reviewedUnresolved,
  mappingCandidates
};

writeJson("tibiavault-npc-review-report.json", report);
writeJson("tibiavault-npc-mapping-candidates.json", mappingCandidates);

console.log("TibiaVault NPC review report generated");
console.log(report.totals);

function classifyConflict(conflict) {
  const localPrice = Number(conflict.localPrice);
  const sourcePrice = Number(conflict.sourcePrice);
  const absoluteDifference = Math.abs(localPrice - sourcePrice);
  const ratio = Math.max(localPrice, sourcePrice) / Math.max(1, Math.min(localPrice, sourcePrice));
  const severity = getConflictSeverity(absoluteDifference, ratio);

  return {
    ...conflict,
    absoluteDifference,
    ratio: Number(ratio.toFixed(2)),
    severity,
    suggestedClassification: severity === "high" ? "review-before-merge" : "source-difference",
    likelyCause: getLikelyCause(conflict, ratio),
    recommendation: "Keep local price active. Store TibiaVault price as reference until reviewed."
  };
}

function getConflictSeverity(absoluteDifference, ratio) {
  if (ratio >= 3 || absoluteDifference >= 10000) return "high";
  if (ratio >= 1.5 || absoluteDifference >= 1000) return "medium";
  return "low";
}

function getLikelyCause(conflict, ratio) {
  if (conflict.npcName === "Rashid" && ratio >= 3) return "possible-global-vs-otserver-or-source-item-difference";
  if (conflict.tradeType === "npcSells") return "server-shop-price-difference";
  return "global-reference-vs-local-source-difference";
}

function reviewUnresolvedTrade(trade) {
  const normalizedItemName = itemLookupKey(trade.itemName);
  const suggestions = findSimilarItems(normalizedItemName);
  const best = suggestions[0] ?? null;

  return {
    ...trade,
    normalizedItemName,
    suggestions,
    suggestedAlias: best?.name ?? null,
    suggestionConfidence: best?.score >= 0.8 ? "medium" : best ? "low" : "none",
    suggestionReason: best ? "word-overlap-with-local-item" : "no-local-similar-item-found",
    reviewStatus: best ? "manual-alias-review" : "manual-item-review"
  };
}

function findSimilarItems(normalizedName) {
  const sourceWords = new Set(normalizedName.split(" ").filter(Boolean));
  const suggestions = [];

  for (const item of itemRows) {
    const itemKey = itemLookupKey(item.name);
    const itemWords = new Set(itemKey.split(" ").filter(Boolean));
    const intersection = [...sourceWords].filter((word) => itemWords.has(word)).length;
    if (intersection === 0) continue;
    const score = intersection / Math.max(sourceWords.size, itemWords.size);
    if (score < 0.45) continue;
    suggestions.push({
      itemId: item.id,
      clientId: item.clientId ?? null,
      name: item.name,
      score: Number(score.toFixed(2))
    });
  }

  return suggestions
    .sort((a, b) => b.score - a.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .slice(0, 5);
}

function sortReviewedConflict(a, b) {
  const severityOrder = { high: 0, medium: 1, low: 2 };
  return severityOrder[a.severity] - severityOrder[b.severity] || b.absoluteDifference - a.absoluteDifference || a.npcName.localeCompare(b.npcName);
}

function readJson(fileName, fallback) {
  try {
    return JSON.parse(readFileSync(path.join(databaseGeneratedRoot, fileName), "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(fileName, data) {
  writeFileSync(path.join(databaseGeneratedRoot, fileName), `${JSON.stringify(data, null, 2)}\n`);
}
