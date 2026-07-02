import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getItemImagePath, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { itemLookupKey, ReinaDataService } from "@/source/web/src/reina-core/database";
import type { ReinaItem, ReinaMonsterLoot } from "@/source/web/src/reina-core/database";
import { createEmptyMonsterFutureData } from "../utils";
import type {
  MonsterAssetInfo,
  MonsterDatabaseRecord,
  MonsterLootEntry,
  MonsterRelatedItem,
  MonsterSearchResult
} from "../types";

const publicDir = path.join(process.cwd(), "public");
const assetExistsCache = new Map<string, boolean>();

export const MonsterDatabaseService = {
  getMonster(name: string): MonsterDatabaseRecord | null {
    const monster = ReinaDataService.getMonsterByName(name);
    if (!monster) return null;

    const loot = this.getLoot(monster.name);
    const relatedItems = this.getRelatedItems(monster.name);
    const image = this.getMonsterImage(monster.name);
    const foundAssetCount = Number(image.exists) + relatedItems.filter((item) => item.hasImage).length;

    return {
      name: monster.name,
      experience: monster.experience,
      health: monster.health,
      speed: monster.speed,
      image,
      loot,
      relatedItems,
      lootItemCount: loot.length,
      foundAssetCount,
      future: createEmptyMonsterFutureData()
    };
  },

  searchMonsters(query: string): MonsterSearchResult[] {
    return ReinaDataService.searchMonsters(query).map((monster) => ({
      name: monster.name,
      experience: monster.experience,
      health: monster.health,
      image: this.getMonsterImage(monster.name)
    }));
  },

  getLoot(monsterName: string): MonsterLootEntry[] {
    return ReinaDataService.getMonsterLoot(monsterName).map((loot) => enrichMonsterLoot(loot));
  },

  getRelatedItems(monsterName: string): MonsterRelatedItem[] {
    const related = new Map<string, MonsterRelatedItem>();

    for (const loot of this.getLoot(monsterName)) {
      const key = loot.itemId ? `id:${loot.itemId}` : `name:${itemLookupKey(loot.itemName)}`;
      if (related.has(key)) continue;
      related.set(key, {
        id: loot.itemId,
        name: loot.itemName,
        sellPrice: loot.sellPrice,
        imagePath: loot.imagePath,
        hasImage: loot.hasImage
      });
    }

    return Array.from(related.values());
  },

  getMonsterImage(monsterName: string): MonsterAssetInfo {
    const imagePath = getMonsterImagePath(monsterName);
    return {
      path: imagePath,
      exists: publicAssetExists(imagePath)
    };
  }
};

function enrichMonsterLoot(loot: ReinaMonsterLoot): MonsterLootEntry {
  const item = findLootItem(loot);
  const itemId = item?.id ?? loot.itemId ?? null;
  const itemName = item?.name ?? loot.itemName ?? "Unknown item";
  const imagePath = itemId ? getItemImagePath(itemId) : getItemImagePath(null);
  const sellPrice = itemId ? ReinaDataService.getNpcSellPrice(itemId) : null;

  return {
    monsterName: loot.monsterName,
    itemId,
    itemName,
    chance: loot.chance ?? null,
    maxCount: loot.maxCount ?? null,
    sellPrice,
    imagePath,
    hasImage: publicAssetExists(imagePath),
    dataStatus: item ? "matched" : "unmatched"
  };
}

function findLootItem(loot: ReinaMonsterLoot): ReinaItem | null {
  if (loot.itemId) {
    const byId = ReinaDataService.findItemById(loot.itemId);
    if (byId) return byId;
  }

  if (loot.itemName) {
    return ReinaDataService.findItemByName(loot.itemName);
  }

  return null;
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
