import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const databaseRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const assetsRoot = path.join(root, "public", "assets");
const outputRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");

const items = readJson(path.join(databaseRoot, "items.json"));
const monsterLoot = readJson(path.join(databaseRoot, "monster-loot.json"));
const npcSellPrices = readJson(path.join(databaseRoot, "npc-sell-prices.json"));

const itemById = new Map(items.map((item) => [item.id, item]));
const itemByName = new Map();
items.forEach((item) => {
  const key = itemLookupKey(item.name);
  if (!itemByName.has(key)) itemByName.set(key, item);
});

const npcPriceByItemId = new Map();
const npcPriceByItemName = new Map();
npcSellPrices.forEach((price) => {
  if (price.itemId && !npcPriceByItemId.has(price.itemId)) npcPriceByItemId.set(price.itemId, price.sellPrice);
  if (price.itemName && !npcPriceByItemName.has(itemLookupKey(price.itemName))) {
    npcPriceByItemName.set(itemLookupKey(price.itemName), price.sellPrice);
  }
});

const usage = new Map();
for (const loot of monsterLoot) {
  const item = resolveLootItem(loot);
  if (!item) continue;
  const entry = usage.get(item.id) ?? { item, lootOccurrenceCount: 0 };
  entry.lootOccurrenceCount += 1;
  usage.set(item.id, entry);
}

const ranking = [...usage.values()]
  .map(({ item, lootOccurrenceCount }) => {
    const sellPrice = getSellPrice(item);
    const hasNpcSellPrice = sellPrice !== undefined;
    const hasImage = existsSync(path.join(assetsRoot, "items", `${item.id}.gif`));
    return {
      itemId: item.id,
      name: item.name,
      lootOccurrenceCount,
      hasNpcSellPrice,
      ...(hasNpcSellPrice ? { sellPrice } : {}),
      hasImage,
      priorityScore: calculatePriorityScore(item, lootOccurrenceCount, hasNpcSellPrice, sellPrice, hasImage)
    };
  })
  .sort((a, b) => b.priorityScore - a.priorityScore || b.lootOccurrenceCount - a.lootOccurrenceCount || a.name.localeCompare(b.name));

mkdirSync(outputRoot, { recursive: true });
writeJson("assets-priority-report.json", {
  generatedAt: new Date().toISOString(),
  totals: {
    rankedItems: ranking.length,
    withNpcSellPrice: ranking.filter((item) => item.hasNpcSellPrice).length,
    withImage: ranking.filter((item) => item.hasImage).length,
    missingImage: ranking.filter((item) => !item.hasImage).length
  },
  ranking
});
writeJson("top-50-assets.json", ranking.slice(0, 50));
writeJson("top-100-assets.json", ranking.slice(0, 100));
writeJson("top-500-assets.json", ranking.slice(0, 500));

console.log("Assets priority report generated");
console.log({
  rankedItems: ranking.length,
  topItem: ranking[0],
  outputRoot: path.relative(root, outputRoot)
});

function resolveLootItem(loot) {
  if (loot.itemId && itemById.has(loot.itemId)) return itemById.get(loot.itemId);
  if (loot.itemName && itemByName.has(itemLookupKey(loot.itemName))) return itemByName.get(itemLookupKey(loot.itemName));
  return null;
}

function getSellPrice(item) {
  return npcPriceByItemId.get(item.id) ?? npcPriceByItemName.get(itemLookupKey(item.name)) ?? item.sellPrice;
}

function calculatePriorityScore(item, lootOccurrenceCount, hasNpcSellPrice, sellPrice = 0, hasImage) {
  const name = itemLookupKey(item.name);
  let score = lootOccurrenceCount * 10;

  if (hasNpcSellPrice) score += 500;
  if (sellPrice >= 10000) score += 120;
  if (sellPrice >= 100000) score += 180;
  if (isCoin(name)) score += 2000;
  if (isCommonSupply(name)) score += 800;
  if (isCreatureProduct(name)) score += 250;
  if (hasImage) score -= 10000;

  return score;
}

function isCoin(name) {
  return ["gold coin", "platinum coin", "crystal coin"].includes(name);
}

function isCommonSupply(name) {
  return /\b(potion|mana|health|spirit|rune|arrow|bolt|spear|supply|food)\b/.test(name);
}

function isCreatureProduct(name) {
  return /\b(fang|claw|tooth|teeth|scale|scales|skin|leather|fur|tail|wing|wings|eye|eyes|bone|bones|shell|feather|plume|pelt|paw|horn|tusk|tentacle|slime|venom|poison|gland|heart|blood|essence|silk|web|spike|spikes)\b/.test(name);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(fileName, data) {
  writeFileSync(path.join(outputRoot, fileName), `${JSON.stringify(data, null, 2)}\n`);
}

function itemLookupKey(name = "") {
  return String(name)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

