import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const generatedDatabaseRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const generatedAssetsRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");

const items = readJson(path.join(generatedDatabaseRoot, "items.json"));
const monsterLoot = readJson(path.join(generatedDatabaseRoot, "monster-loot.json"));

const itemById = new Map(items.map((item) => [item.id, item]));
const itemByName = new Map();
items.forEach((item) => {
  const key = itemLookupKey(item.name);
  if (!itemByName.has(key)) itemByName.set(key, item);
});

const priorityNames = ["gold coin", "platinum coin", "crystal coin"];
const priority = [];

for (const name of priorityNames) {
  const item = itemByName.get(itemLookupKey(name));
  if (item) priority.push(toEntry(item));
}

const frequency = new Map();
for (const loot of monsterLoot) {
  const item = resolveLootItem(loot);
  if (!item) continue;
  const current = frequency.get(item.id) ?? { item, occurrences: 0, maxCountTotal: 0 };
  current.occurrences += 1;
  current.maxCountTotal += Number(loot.maxCount ?? 1);
  frequency.set(item.id, current);
}

const recurringLoot = [...frequency.values()]
  .sort((a, b) => b.occurrences - a.occurrences || b.maxCountTotal - a.maxCountTotal || a.item.name.localeCompare(b.item.name))
  .map(({ item }) => toEntry(item));

const byId = new Map();
[...priority, ...recurringLoot].forEach((entry) => {
  if (!byId.has(entry.itemId)) byId.set(entry.itemId, entry);
});

const sampleAssets = [...byId.values()].slice(0, 50);

mkdirSync(generatedAssetsRoot, { recursive: true });
writeFileSync(path.join(generatedAssetsRoot, "sample-assets-needed.json"), `${JSON.stringify(sampleAssets, null, 2)}\n`);

console.log(`Generated ${sampleAssets.length} sample asset priorities`);
console.log(sampleAssets.slice(0, 10));

function resolveLootItem(loot) {
  if (loot.itemId && itemById.has(loot.itemId)) return itemById.get(loot.itemId);
  if (loot.itemName && itemByName.has(itemLookupKey(loot.itemName))) return itemByName.get(itemLookupKey(loot.itemName));
  return null;
}

function toEntry(item) {
  return {
    itemId: item.id,
    name: item.name,
    expectedPath: `/assets/items/${item.id}.gif`
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
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

