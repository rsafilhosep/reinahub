import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemLookupKey } from "../../../reina-core/database/importers/item-normalizer.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../../../../../../..");
const inboxRoot = path.join(repoRoot, "files_repository", "hunt_unmatched_reviews");
const generatedRoot = path.join(repoRoot, "source", "web", "src", "features", "hunt-analyzer", "generated");
const databaseGeneratedRoot = path.join(repoRoot, "source", "web", "src", "reina-core", "database", "generated");

mkdirSync(inboxRoot, { recursive: true });
mkdirSync(generatedRoot, { recursive: true });

const items = readJson(path.join(databaseGeneratedRoot, "items.json"), []);
const supplementalItems = readJson(path.join(databaseGeneratedRoot, "supplemental-items.json"), []);
const itemIndex = buildItemIndex([...items, ...supplementalItems]);
const reviewFiles = listJsonFiles(inboxRoot);
const reviews = reviewFiles.flatMap(readReviewFile);
const grouped = buildGroupedReview(reviews, itemIndex);

const report = {
  generatedAt: new Date().toISOString(),
  inboxRoot,
  filesRead: reviewFiles.length,
  totalOccurrences: reviews.length,
  uniqueUnmatchedItems: grouped.length,
  likelyResolvedByCurrentDatabase: grouped.filter((item) => item.currentDatabaseMatch).length,
  needsManualReview: grouped.filter((item) => !item.currentDatabaseMatch).length,
  items: grouped
};

writeJson(path.join(generatedRoot, "unmatched-loot-review-report.json"), report);
writeJson(
  path.join(generatedRoot, "unmatched-loot-alias-candidates.json"),
  grouped.filter((item) => !item.currentDatabaseMatch)
);

console.log("Unmatched loot review complete");
console.log({
  filesRead: report.filesRead,
  totalOccurrences: report.totalOccurrences,
  uniqueUnmatchedItems: report.uniqueUnmatchedItems,
  likelyResolvedByCurrentDatabase: report.likelyResolvedByCurrentDatabase,
  needsManualReview: report.needsManualReview
});

function listJsonFiles(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"))
    .map((entry) => path.join(root, entry.name));
}

function readReviewFile(filePath) {
  const raw = readJson(filePath, null);
  if (!raw || !Array.isArray(raw.items)) return [];
  return raw.items.map((item) => ({
    filePath,
    sourceName: raw.sourceName ?? path.basename(filePath),
    name: String(item.name ?? "").trim(),
    normalizedName: String(item.normalizedName ?? itemLookupKey(item.name ?? "")).trim(),
    count: Number(item.count) || 0
  })).filter((item) => item.name);
}

function buildGroupedReview(reviews, index) {
  const grouped = new Map();
  for (const review of reviews) {
    const key = review.normalizedName || itemLookupKey(review.name);
    const current = grouped.get(key) ?? {
      name: review.name,
      normalizedName: key,
      totalCount: 0,
      occurrences: 0,
      sources: new Set(),
      filePaths: new Set(),
      currentDatabaseMatch: null,
      suggestedAction: "review-manual-mapping",
      suggestedManualMapping: {
        alias: review.name,
        targetItemName: ""
      }
    };
    current.totalCount += review.count;
    current.occurrences += 1;
    current.sources.add(review.sourceName);
    current.filePaths.add(path.relative(repoRoot, review.filePath));
    const match = index.get(key);
    if (match) {
      current.currentDatabaseMatch = {
        itemId: match.id,
        name: match.name,
        clientId: match.clientId ?? null
      };
      current.suggestedAction = "rerun-hunt-or-ignore";
      current.suggestedManualMapping.targetItemName = match.name;
    }
    grouped.set(key, current);
  }

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      sources: [...item.sources].sort(),
      filePaths: [...item.filePaths].sort()
    }))
    .sort((a, b) => b.totalCount - a.totalCount || a.name.localeCompare(b.name));
}

function buildItemIndex(allItems) {
  const index = new Map();
  for (const item of allItems) {
    if (!item?.name) continue;
    const key = itemLookupKey(item.name);
    if (!index.has(key)) index.set(key, item);
  }
  return index;
}

function readJson(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
