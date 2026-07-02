import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getItemImagePath, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { getReinaDatabaseSnapshot, itemLookupKey, ReinaDataService } from "@/source/web/src/reina-core/database";
import type { ReinaItem, ReinaMonsterLoot } from "@/source/web/src/reina-core/database";
import { TaxonomyService } from "@/source/web/src/reina-core/taxonomy";
import { createEmptyItemFutureData } from "../utils";
import type {
  ItemAssetInfo,
  ItemDatabaseRecord,
  ItemDroppedByMonster,
  ItemNpcTradeReference,
  ItemSearchResult
} from "../types";

const publicDir = path.join(process.cwd(), "public");
const assetExistsCache = new Map<string, boolean>();
const NPC_PRICE_REFERENCE_NAME = "NPC Price Reference";

export const ItemDatabaseService = {
  getItem(itemId: number | string): ItemDatabaseRecord | null {
    const item = ReinaDataService.findItemById(itemId);
    return item ? buildItemRecord(item) : null;
  },

  getItemByName(name: string): ItemDatabaseRecord | null {
    const item = ReinaDataService.findItemByName(name);
    return item ? buildItemRecord(item) : null;
  },

  searchItems(query: string, options?: { category?: string | null }): ItemSearchResult[] {
    const category = options?.category?.trim() || null;
    return ReinaDataService.searchItems(query)
      .map((item) => buildItemSearchResult(item))
      .filter((item) => !category || item.category === category || item.slot === category || item.weaponType === category);
  },

  getNpcPrice(itemId: number | string): number | null {
    return ReinaDataService.getNpcSellPrice(itemId);
  },

  getBoughtBy(itemId: number | string): ItemNpcTradeReference[] {
    const price = this.getNpcPrice(itemId);
    if (price === null) return [];

    return [
      {
        npcName: NPC_PRICE_REFERENCE_NAME,
        normalizedName: itemLookupKey(NPC_PRICE_REFERENCE_NAME),
        city: null,
        price,
        tradeType: "buy",
        npcHref: `/npcs?npc=${encodeURIComponent(NPC_PRICE_REFERENCE_NAME)}`
      }
    ];
  },

  getSoldBy(itemId: number | string): ItemNpcTradeReference[] {
    return [];
  },

  getDroppedBy(itemId: number | string): ItemDroppedByMonster[] {
    const item = ReinaDataService.findItemById(itemId);
    if (!item) return [];

    const lookupKeys = new Set([itemLookupKey(item.name)]);
    if (item.clientId) lookupKeys.add(String(item.clientId));

    const { monsterLoot } = getReinaDatabaseSnapshot();
    const matchingLoot = monsterLoot.filter((loot) => lootMatchesItem(loot, item, lookupKeys));
    const droppedBy = new Map<string, ItemDroppedByMonster>();

    for (const loot of matchingLoot) {
      if (droppedBy.has(loot.monsterName)) continue;
      const monster = ReinaDataService.getMonsterByName(loot.monsterName);
      const imagePath = getMonsterImagePath(loot.monsterName);
      droppedBy.set(loot.monsterName, {
        monsterName: loot.monsterName,
        normalizedName: itemLookupKey(loot.monsterName),
        experience: monster?.experience ?? null,
        health: monster?.health ?? null,
        imagePath,
        hasImage: publicAssetExists(imagePath),
        chance: loot.chance ?? null,
        maxCount: loot.maxCount ?? null
      });
    }

    return Array.from(droppedBy.values()).sort((a, b) => a.monsterName.localeCompare(b.monsterName));
  },

  getItemImage(itemId: number | string): ItemAssetInfo {
    const imagePath = getItemImagePath(itemId);
    return {
      path: imagePath,
      exists: publicAssetExists(imagePath)
    };
  }
};

function buildItemRecord(item: ReinaItem): ItemDatabaseRecord {
  const droppedBy = ItemDatabaseService.getDroppedBy(item.id);
  const boughtByNpcs = ItemDatabaseService.getBoughtBy(item.id);
  const soldByNpcs = ItemDatabaseService.getSoldBy(item.id);
  const classification = TaxonomyService.classifyItem(item);

  return {
    id: item.id,
    name: item.name,
    clientId: item.clientId ?? null,
    npcPrice: ItemDatabaseService.getNpcPrice(item.id),
    category: classification.category,
    slot: classification.slot ?? null,
    weaponType: classification.weaponType ?? null,
    classificationConfidence: classification.confidence,
    image: ItemDatabaseService.getItemImage(item.id),
    droppedBy,
    droppedByCount: droppedBy.length,
    boughtByNpcs,
    soldByNpcs,
    boughtByNpcCount: boughtByNpcs.length,
    soldByNpcCount: soldByNpcs.length,
    future: createEmptyItemFutureData()
  };
}

function buildItemSearchResult(item: ReinaItem): ItemSearchResult {
  const classification = TaxonomyService.classifyItem(item);
  return {
    id: item.id,
    name: item.name,
    clientId: item.clientId ?? null,
    npcPrice: ItemDatabaseService.getNpcPrice(item.id),
    category: classification.category,
    slot: classification.slot ?? null,
    weaponType: classification.weaponType ?? null,
    classificationConfidence: classification.confidence,
    image: ItemDatabaseService.getItemImage(item.id)
  };
}

function lootMatchesItem(loot: ReinaMonsterLoot, item: ReinaItem, lookupKeys: Set<string>) {
  if (loot.itemId && (loot.itemId === item.id || loot.itemId === item.clientId)) return true;
  if (loot.itemName && lookupKeys.has(itemLookupKey(loot.itemName))) return true;
  return false;
}

function publicAssetExists(assetPath: string) {
  const cached = assetExistsCache.get(assetPath);
  if (cached !== undefined) return cached;

  const normalizedPath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
  const absolutePath = path.join(publicDir, normalizedPath);
  const exists = fs.existsSync(absolutePath);
  assetExistsCache.set(assetPath, exists);
  return exists;
}
