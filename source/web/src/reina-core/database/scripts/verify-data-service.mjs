import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const databaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const items = readJson("generated/items.json");
const monsters = readJson("generated/monsters.json");
const monsterLoot = readJson("generated/monster-loot.json");
const npcSellPrices = readJson("generated/npc-sell-prices.json");

const service = createService({ items, monsters, monsterLoot, npcSellPrices });

const goldCoin = service.findItemByName("gold coin");
const demon = service.getMonsterByName("demon");
const demonLoot = service.getMonsterLoot("demon");
const pricedItem = items.find((item) => item.sellPrice);
const pricedItemPrice = pricedItem ? service.getNpcSellPrice(pricedItem.id) : null;

assert(goldCoin, "gold coin should be found");
assert(demon, "demon should be found");
assert(demonLoot.length > 0, "demon loot should not be empty");
assert(pricedItem && pricedItemPrice !== null, "an item with NPC price should be found");

console.log("ReinaDataService verification passed");
console.log({
  goldCoin,
  demon: demon ? { name: demon.name, experience: demon.experience, health: demon.health, lootRows: demonLoot.length } : null,
  demonLootSample: demonLoot.slice(0, 8),
  npcPriceSample: pricedItem ? { item: pricedItem.name, id: pricedItem.id, sellPrice: pricedItemPrice } : null,
  itemSearchSample: service.searchItems("coin").slice(0, 5).map((item) => item.name),
  monsterSearchSample: service.searchMonsters("demon").slice(0, 5).map((monster) => monster.name),
  ratSearchSample: service.searchMonsters("rat").slice(0, 10).map((monster) => monster.name)
});

function createService(data) {
  const itemById = new Map();
  const itemByName = new Map();
  const monsterByName = new Map();
  const lootByMonsterName = new Map();
  const priceById = new Map();

  data.items.forEach((item) => {
    if (!itemById.has(item.id)) itemById.set(item.id, item);
    pushMap(itemByName, itemLookupKey(item.name), item);
  });
  data.monsters.forEach((monster) => monsterByName.set(itemLookupKey(monster.name), monster));
  data.monsterLoot.forEach((loot) => pushMap(lootByMonsterName, itemLookupKey(loot.monsterName), loot));
  data.npcSellPrices.forEach((price) => {
    if (price.itemId && !priceById.has(price.itemId)) priceById.set(price.itemId, price);
  });

  return {
    findItemById: (id) => itemById.get(Number(id)) ?? null,
    findItemByName: (name) => itemByName.get(itemLookupKey(name))?.[0] ?? null,
    getNpcSellPrice: (itemId) => priceById.get(Number(itemId))?.sellPrice ?? itemById.get(Number(itemId))?.sellPrice ?? null,
    getMonsterByName: (name) => monsterByName.get(itemLookupKey(name)) ?? null,
    getMonsterLoot: (name) => lootByMonsterName.get(itemLookupKey(name)) ?? [],
    searchItems: (query) => rankSearchResults(data.items, itemLookupKey(query), (item) => item.name).slice(0, 50),
    searchMonsters: (query) => rankSearchResults(data.monsters, itemLookupKey(query), (monster) => monster.name).slice(0, 50)
  };
}

function readJson(relativePath) {
  return JSON.parse(readFileSync(path.join(databaseRoot, relativePath), "utf8"));
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

function pushMap(map, key, value) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function rankSearchResults(rows, normalizedQuery, getName) {
  if (!normalizedQuery) return [];
  return rows
    .map((row) => {
      const name = getName(row);
      const normalizedName = itemLookupKey(name);
      const score = getSearchScore(normalizedName, normalizedQuery);
      return { row, name, score };
    })
    .filter((entry) => entry.score < Number.POSITIVE_INFINITY)
    .sort((a, b) => a.score - b.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
    .map((entry) => entry.row);
}

function getSearchScore(normalizedName, normalizedQuery) {
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(`${normalizedQuery} `)) return 5;

  const words = normalizedName.split(" ").filter(Boolean);
  if (words.includes(normalizedQuery)) return 10;
  if (normalizedName.startsWith(normalizedQuery)) return 20;
  if (words.some((word) => word.startsWith(normalizedQuery))) return 30;

  const index = normalizedName.indexOf(normalizedQuery);
  if (index >= 0) return 100 + index;

  return Number.POSITIVE_INFINITY;
}

function assert(condition, message) {
  if (!condition) {
    console.error(`Verification failed: ${message}`);
    process.exit(1);
  }
}
