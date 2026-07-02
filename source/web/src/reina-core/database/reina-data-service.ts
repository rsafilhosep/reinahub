import "server-only";
import itemsJson from "./generated/items.json";
import monsterLootJson from "./generated/monster-loot.json";
import monstersJson from "./generated/monsters.json";
import npcSellPricesJson from "./generated/npc-sell-prices.json";
import { itemLookupKey } from "./normalize";
import type { ReinaItem, ReinaMonster, ReinaMonsterLoot, ReinaNpcSellPrice } from "./types";

const items = itemsJson as ReinaItem[];
const monsters = monstersJson as ReinaMonster[];
const monsterLoot = monsterLootJson as ReinaMonsterLoot[];
const npcSellPrices = npcSellPricesJson as ReinaNpcSellPrice[];

type ReinaDataIndex = {
  itemsById: Map<number, ReinaItem>;
  itemsByClientId: Map<number, ReinaItem>;
  itemsByName: Map<string, ReinaItem[]>;
  npcPricesByItemId: Map<number, ReinaNpcSellPrice>;
  npcPricesByItemName: Map<string, ReinaNpcSellPrice>;
  monstersByName: Map<string, ReinaMonster>;
  monsterLootByName: Map<string, ReinaMonsterLoot[]>;
};

let cachedIndex: ReinaDataIndex | null = null;

export const ReinaDataService = {
  findItemById(id: number | string) {
    const numericId = Number(id);
    if (!Number.isFinite(numericId)) return null;
    const index = getIndex();
    return index.itemsById.get(numericId) ?? index.itemsByClientId.get(numericId) ?? null;
  },

  findItemByName(name: string) {
    return getIndex().itemsByName.get(itemLookupKey(name))?.[0] ?? null;
  },

  getNpcSellPrice(itemId: number | string) {
    const item = this.findItemById(itemId);
    const numericId = Number(itemId);
    const index = getIndex();
    const price =
      (Number.isFinite(numericId) ? index.npcPricesByItemId.get(numericId) : undefined) ??
      (item ? index.npcPricesByItemId.get(item.id) ?? index.npcPricesByItemName.get(itemLookupKey(item.name)) : undefined);

    return price?.sellPrice ?? item?.sellPrice ?? null;
  },

  getMonsterByName(name: string) {
    return getIndex().monstersByName.get(itemLookupKey(name)) ?? null;
  },

  getMonsterLoot(monsterName: string) {
    return getIndex().monsterLootByName.get(itemLookupKey(monsterName)) ?? [];
  },

  searchItems(query: string) {
    const normalizedQuery = itemLookupKey(query);
    if (!normalizedQuery) return [];
    return rankSearchResults(items, normalizedQuery, (item) => item.name).slice(0, 50);
  },

  searchMonsters(query: string) {
    const normalizedQuery = itemLookupKey(query);
    if (!normalizedQuery) return [];
    return rankSearchResults(monsters, normalizedQuery, (monster) => monster.name).slice(0, 50);
  }
};

export function getReinaDatabaseSnapshot() {
  return {
    items,
    monsters,
    monsterLoot,
    npcSellPrices
  };
}

function getIndex() {
  if (cachedIndex) return cachedIndex;

  const itemsById = new Map<number, ReinaItem>();
  const itemsByClientId = new Map<number, ReinaItem>();
  const itemsByName = new Map<string, ReinaItem[]>();
  const npcPricesByItemId = new Map<number, ReinaNpcSellPrice>();
  const npcPricesByItemName = new Map<string, ReinaNpcSellPrice>();
  const monstersByName = new Map<string, ReinaMonster>();
  const monsterLootByName = new Map<string, ReinaMonsterLoot[]>();

  for (const item of items) {
    if (!itemsById.has(item.id)) itemsById.set(item.id, item);
    if (item.clientId && !itemsByClientId.has(item.clientId)) itemsByClientId.set(item.clientId, item);
    pushMap(itemsByName, itemLookupKey(item.name), item);
  }

  for (const price of npcSellPrices) {
    if (price.itemId && !npcPricesByItemId.has(price.itemId)) npcPricesByItemId.set(price.itemId, price);
    if (price.itemName && !npcPricesByItemName.has(itemLookupKey(price.itemName))) {
      npcPricesByItemName.set(itemLookupKey(price.itemName), price);
    }
  }

  for (const monster of monsters) {
    monstersByName.set(itemLookupKey(monster.name), monster);
  }

  for (const loot of monsterLoot) {
    pushMap(monsterLootByName, itemLookupKey(loot.monsterName), loot);
  }

  cachedIndex = {
    itemsById,
    itemsByClientId,
    itemsByName,
    npcPricesByItemId,
    npcPricesByItemName,
    monstersByName,
    monsterLootByName
  };
  return cachedIndex;
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function rankSearchResults<T>(rows: T[], normalizedQuery: string, getName: (row: T) => string) {
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

function getSearchScore(normalizedName: string, normalizedQuery: string) {
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
