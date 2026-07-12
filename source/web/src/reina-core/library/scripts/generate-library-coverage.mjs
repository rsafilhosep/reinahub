import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemLookupKey } from "../../database/importers/item-normalizer.mjs";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../../../../../..");
const databaseRoot = path.join(repoRoot, "source", "web", "src", "reina-core", "database", "generated");
const publicAssetsRoot = path.join(repoRoot, "public", "assets");
const outputRoot = path.join(repoRoot, "source", "web", "src", "reina-core", "library", "generated");
const imbuementsPath = path.join(repoRoot, "source", "web", "src", "features", "imbuement-database", "data", "imbuements.json");

mkdirSync(outputRoot, { recursive: true });

const sourceItems = readJson(path.join(databaseRoot, "items.json"), []);
const supplementalItems = readJson(path.join(databaseRoot, "supplemental-items.json"), []);
const monsterLoot = readJson(path.join(databaseRoot, "monster-loot.json"), []);
const npcSellPrices = readJson(path.join(databaseRoot, "npc-sell-prices.json"), []);
const npcTrades = readJson(path.join(databaseRoot, "npc-trades.json"), []);
const imbuements = readJson(imbuementsPath, []);
const items = mergeItems(sourceItems, supplementalItems);
const itemIndex = buildItemIndex(items);
const lootStats = buildLootStats(monsterLoot, itemIndex);
const priceIndex = buildPriceIndex(items, itemIndex, npcSellPrices, npcTrades);
const imbuementKeys = buildImbuementKeySet(imbuements);
const rows = items.map((item) => buildItemCoverageRow(item, lootStats, priceIndex, imbuementKeys));

const report = {
  generatedAt: new Date().toISOString(),
  totals: buildTotals(rows, {
    sourceItems: sourceItems.length,
    supplementalItems: supplementalItems.length,
    monsterLootRefs: monsterLoot.length,
    npcSellPriceRefs: npcSellPrices.length,
    npcTradeRefs: npcTrades.length
  }),
  topMissingImages: rows.filter((row) => !row.hasImage && row.importanceScore > 0).sort(sortByPriority).slice(0, 500),
  topMissingNpcPrices: rows.filter((row) => shouldReviewNpcSellPrice(row)).sort(sortByPriority).slice(0, 500),
  highValueComplete: rows.filter((row) => row.hasImage && row.hasNpcSellPrice && row.lootOccurrenceCount > 0).sort(sortByPriority).slice(0, 200)
};

writeJson(path.join(outputRoot, "library-coverage-report.json"), report);
writeJson(path.join(outputRoot, "missing-item-images-priority.json"), report.topMissingImages);
writeJson(path.join(outputRoot, "missing-npc-prices-priority.json"), report.topMissingNpcPrices);
writeJson(path.join(outputRoot, "library-coverage-summary.json"), report.totals);

console.log("Library coverage complete");
console.log(report.totals);

function buildItemCoverageRow(item, lootStats, priceIndex, imbuementKeys) {
  const key = itemLookupKey(item.name);
  const loot = lootStats.get(getItemKey(item)) ?? lootStats.get(`name:${key}`) ?? emptyLootStats();
  const price = priceIndex.get(getItemKey(item)) ?? priceIndex.get(`name:${key}`) ?? null;
  const hasImage = existsSync(path.join(publicAssetsRoot, "items", `${item.id}.gif`));
  const isCurrency = isCurrencyItem(item.name);
  const isSupply = isSupplyItem(item.name);
  const isImbuementMaterial = imbuementKeys.has(key);
  const hasNpcSellPrice = Boolean(price);
  const importanceScore =
    loot.occurrenceCount * 10 +
    loot.monsterCount * 4 +
    (hasNpcSellPrice ? 450 : 0) +
    (isCurrency ? 700 : 0) +
    (isSupply ? 450 : 0) +
    (isImbuementMaterial ? 650 : 0);

  return {
    itemId: item.id,
    clientId: item.clientId ?? null,
    name: item.name,
    hasImage,
    expectedImagePath: `/assets/items/${item.id}.gif`,
    hasNpcSellPrice,
    sellPrice: price?.sellPrice ?? item.sellPrice ?? null,
    sellPriceSource: price?.source ?? (item.sellPrice ? "item" : null),
    lootOccurrenceCount: loot.occurrenceCount,
    lootMonsterCount: loot.monsterCount,
    isCurrency,
    isSupply,
    isImbuementMaterial,
    importanceScore,
    suggestedImageAction: hasImage ? "complete" : "add-item-gif",
    suggestedPriceAction: hasNpcSellPrice ? "complete" : loot.occurrenceCount > 0 ? "review-npc-sell-price" : "low-priority"
  };
}

function buildTotals(rows, sources) {
  const totalItems = rows.length;
  const withImage = rows.filter((row) => row.hasImage).length;
  const withNpcSellPrice = rows.filter((row) => row.hasNpcSellPrice).length;
  const withLoot = rows.filter((row) => row.lootOccurrenceCount > 0).length;
  const important = rows.filter((row) => row.importanceScore > 0);
  const importantWithImage = important.filter((row) => row.hasImage).length;
  const importantWithNpcSellPrice = important.filter((row) => row.hasNpcSellPrice).length;

  return {
    ...sources,
    totalItems,
    withImage,
    missingImage: totalItems - withImage,
    imageCoveragePct: pct(withImage, totalItems),
    withNpcSellPrice,
    missingNpcSellPrice: totalItems - withNpcSellPrice,
    npcSellPriceCoveragePct: pct(withNpcSellPrice, totalItems),
    withLoot,
    lootItemsMissingImage: rows.filter((row) => row.lootOccurrenceCount > 0 && !row.hasImage).length,
    lootItemsMissingNpcSellPrice: rows.filter((row) => row.lootOccurrenceCount > 0 && !row.hasNpcSellPrice).length,
    lootSellableCandidatesMissingNpcSellPrice: rows.filter((row) => shouldReviewNpcSellPrice(row)).length,
    imbuementMaterials: rows.filter((row) => row.isImbuementMaterial).length,
    imbuementMaterialsMissingImage: rows.filter((row) => row.isImbuementMaterial && !row.hasImage).length,
    imbuementMaterialsMissingNpcSellPrice: rows.filter((row) => row.isImbuementMaterial && !row.hasNpcSellPrice).length,
    importantItems: important.length,
    importantImageCoveragePct: pct(importantWithImage, important.length),
    importantNpcSellPriceCoveragePct: pct(importantWithNpcSellPrice, important.length)
  };
}

function buildLootStats(monsterLoot, itemIndex) {
  const stats = new Map();
  for (const loot of monsterLoot) {
    const key = resolveLootItemKey(loot, itemIndex);
    const current = stats.get(key) ?? { occurrenceCount: 0, monsters: new Set() };
    current.occurrenceCount += 1;
    if (loot.monsterName) current.monsters.add(loot.monsterName);
    stats.set(key, current);
  }
  const normalized = new Map();
  for (const [key, value] of stats.entries()) {
    normalized.set(key, { occurrenceCount: value.occurrenceCount, monsterCount: value.monsters.size });
  }
  return normalized;
}

function buildPriceIndex(items, itemIndex, npcSellPrices, npcTrades) {
  const index = new Map();
  for (const item of items) {
    if (Number.isFinite(Number(item.sellPrice)) && Number(item.sellPrice) > 0) {
      setBestPrice(index, getItemKey(item), Number(item.sellPrice), "item");
      setBestPrice(index, `name:${itemLookupKey(item.name)}`, Number(item.sellPrice), "item");
    }
  }
  for (const price of npcSellPrices) {
    if (!price.sellPrice) continue;
    const item = resolveItem(price, itemIndex);
    const source = "npc-sell-prices";
    if (item) setBestPrice(index, getItemKey(item), price.sellPrice, source);
    if (price.itemName) setBestPrice(index, `name:${itemLookupKey(price.itemName)}`, price.sellPrice, source);
  }
  for (const trade of npcTrades) {
    if (trade.tradeType !== "npcBuys" || !trade.price) continue;
    const item = resolveItem(trade, itemIndex);
    const source = "npc-trades";
    if (item) setBestPrice(index, getItemKey(item), trade.price, source);
    if (trade.itemName) setBestPrice(index, `name:${itemLookupKey(trade.itemName)}`, trade.price, source);
  }
  return index;
}

function setBestPrice(index, key, sellPrice, source) {
  const current = index.get(key);
  if (!current || sellPrice > current.sellPrice) index.set(key, { sellPrice, source });
}

function buildImbuementKeySet(imbuements) {
  const keys = new Set();
  for (const imbuement of imbuements) {
    for (const material of imbuement.materials ?? []) {
      if (material.itemName) keys.add(itemLookupKey(material.itemName));
    }
  }
  return keys;
}

function buildItemIndex(items) {
  const byId = new Map();
  const byName = new Map();
  for (const item of items) {
    byId.set(Number(item.id), item);
    if (item.clientId) byId.set(Number(item.clientId), item);
    byName.set(itemLookupKey(item.name), item);
  }
  return { byId, byName };
}

function resolveLootItemKey(loot, itemIndex) {
  const item = resolveItem(loot, itemIndex);
  if (item) return getItemKey(item);
  if (loot.itemName) return `name:${itemLookupKey(loot.itemName)}`;
  return `id:${loot.itemId}`;
}

function resolveItem(ref, itemIndex) {
  const id = Number(ref.itemId ?? ref.id ?? ref.clientId);
  if (Number.isFinite(id) && itemIndex.byId.has(id)) return itemIndex.byId.get(id);
  const name = ref.itemName ?? ref.name;
  if (name) return itemIndex.byName.get(itemLookupKey(name)) ?? null;
  return null;
}

function getItemKey(item) {
  return `id:${Number(item.id)}`;
}

function mergeItems(primaryItems, extraItems) {
  const index = buildItemIndex(primaryItems);
  const merged = [...primaryItems];
  for (const item of extraItems) {
    if (index.byId.has(Number(item.id)) || (item.clientId && index.byId.has(Number(item.clientId))) || index.byName.has(itemLookupKey(item.name))) continue;
    merged.push(item);
    index.byId.set(Number(item.id), item);
    if (item.clientId) index.byId.set(Number(item.clientId), item);
    index.byName.set(itemLookupKey(item.name), item);
  }
  return merged;
}

function isCurrencyItem(name) {
  return /\b(gold|platinum|crystal)\s+coin\b/i.test(name);
}

function isSupplyItem(name) {
  return /\b(potion|rune|arrow|bolt|spear)\b/i.test(name);
}

function sortByPriority(a, b) {
  return b.importanceScore - a.importanceScore || b.lootOccurrenceCount - a.lootOccurrenceCount || a.name.localeCompare(b.name);
}

function shouldReviewNpcSellPrice(row) {
  return row.lootOccurrenceCount > 0 && !row.hasNpcSellPrice && !row.isCurrency && !row.isSupply;
}

function emptyLootStats() {
  return { occurrenceCount: 0, monsterCount: 0 };
}

function pct(part, total) {
  return total > 0 ? Number(((part / total) * 100).toFixed(2)) : 0;
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
