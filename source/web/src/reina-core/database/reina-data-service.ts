import "server-only";
import itemsJson from "./generated/items.json";
import monsterLootJson from "./generated/monster-loot.json";
import monstersJson from "./generated/monsters.json";
import npcsJson from "./generated/npcs.json";
import npcSellPricesJson from "./generated/npc-sell-prices.json";
import npcTradesJson from "./generated/npc-trades.json";
import supplementalItemsJson from "./generated/supplemental-items.json";
import { rankSearchResults } from "@/source/web/src/reina-core/search";
import { itemLookupKey } from "./normalize";
import type { ReinaItem, ReinaMonster, ReinaMonsterLoot, ReinaNpc, ReinaNpcSellPrice, ReinaNpcTrade } from "./types";

const sourceItems = itemsJson as ReinaItem[];
const supplementalItems = supplementalItemsJson as ReinaItem[];
const items = mergeItems(sourceItems, supplementalItems);
const monsters = monstersJson as ReinaMonster[];
const monsterLoot = monsterLootJson as ReinaMonsterLoot[];
const npcs = npcsJson as ReinaNpc[];
const npcSellPrices = npcSellPricesJson as ReinaNpcSellPrice[];
const npcTrades = npcTradesJson as ReinaNpcTrade[];

type ReinaDataIndex = {
  itemsById: Map<number, ReinaItem>;
  itemsByClientId: Map<number, ReinaItem>;
  itemsByName: Map<string, ReinaItem[]>;
  npcPricesByItemId: Map<number, ReinaNpcSellPrice>;
  npcPricesByItemName: Map<string, ReinaNpcSellPrice>;
  monstersByName: Map<string, ReinaMonster>;
  monsterLootByName: Map<string, ReinaMonsterLoot[]>;
  npcsByName: Map<string, ReinaNpc>;
  npcTradesByNpcName: Map<string, ReinaNpcTrade[]>;
  npcTradesByItemId: Map<number, ReinaNpcTrade[]>;
  npcTradesByItemName: Map<string, ReinaNpcTrade[]>;
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

  getNpcByName(name: string) {
    return getIndex().npcsByName.get(itemLookupKey(name)) ?? null;
  },

  searchNpcs(query: string) {
    return rankSearchResults(npcs, query, (npc) => npc.name, 50);
  },

  getNpcTrades(npcName: string) {
    return getIndex().npcTradesByNpcName.get(itemLookupKey(npcName)) ?? [];
  },

  getNpcTradesForItem(itemId: number | string) {
    const item = this.findItemById(itemId);
    const numericId = Number(itemId);
    const index = getIndex();
    const trades = new Map<string, ReinaNpcTrade>();
    const add = (trade: ReinaNpcTrade) => trades.set(`${trade.npcName}:${trade.tradeType}:${trade.price}:${trade.itemName}`, trade);

    if (Number.isFinite(numericId)) {
      for (const trade of index.npcTradesByItemId.get(numericId) ?? []) add(trade);
    }

    if (item) {
      for (const trade of index.npcTradesByItemId.get(item.id) ?? []) add(trade);
      if (item.clientId) {
        for (const trade of index.npcTradesByItemId.get(item.clientId) ?? []) add(trade);
      }
      for (const trade of index.npcTradesByItemName.get(itemLookupKey(item.name)) ?? []) add(trade);
    }

    return Array.from(trades.values()).sort((a, b) => a.npcName.localeCompare(b.npcName) || a.price - b.price);
  },

  searchItems(query: string) {
    return rankSearchResults(items, query, (item) => item.name, 50);
  },

  searchMonsters(query: string) {
    return rankSearchResults(monsters, query, (monster) => monster.name, 50);
  }
};

export function getReinaDatabaseSnapshot() {
  return {
    items,
    sourceItems,
    supplementalItems,
    monsters,
    monsterLoot,
    npcs,
    npcTrades,
    npcSellPrices
  };
}

function mergeItems(primaryItems: ReinaItem[], extraItems: ReinaItem[]) {
  const byId = new Set(primaryItems.flatMap((item) => [item.id, item.clientId].filter(Boolean) as number[]));
  const byName = new Set(primaryItems.map((item) => itemLookupKey(item.name)));
  const merged: ReinaItem[] = primaryItems.map((item) => ({ ...item, dataSource: item.dataSource ?? "items.xml" }));

  for (const item of extraItems) {
    if (byId.has(item.id) || (item.clientId && byId.has(item.clientId)) || byName.has(itemLookupKey(item.name))) continue;
    merged.push({ ...item, dataSource: item.dataSource ?? "supplemental" });
    byId.add(item.id);
    if (item.clientId) byId.add(item.clientId);
    byName.add(itemLookupKey(item.name));
  }

  return merged.sort((a, b) => a.id - b.id);
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
  const npcsByName = new Map<string, ReinaNpc>();
  const npcTradesByNpcName = new Map<string, ReinaNpcTrade[]>();
  const npcTradesByItemId = new Map<number, ReinaNpcTrade[]>();
  const npcTradesByItemName = new Map<string, ReinaNpcTrade[]>();

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

  for (const npc of npcs) {
    npcsByName.set(itemLookupKey(npc.name), npc);
  }

  for (const trade of npcTrades) {
    pushMap(npcTradesByNpcName, itemLookupKey(trade.npcName), trade);
    if (trade.itemId) pushMap(npcTradesByItemId, trade.itemId, trade);
    if (trade.clientId) pushMap(npcTradesByItemId, trade.clientId, trade);
    pushMap(npcTradesByItemName, itemLookupKey(trade.itemName), trade);
  }

  cachedIndex = {
    itemsById,
    itemsByClientId,
    itemsByName,
    npcPricesByItemId,
    npcPricesByItemName,
    monstersByName,
    monsterLootByName,
    npcsByName,
    npcTradesByNpcName,
    npcTradesByItemId,
    npcTradesByItemName
  };
  return cachedIndex;
}

function pushMap<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}
