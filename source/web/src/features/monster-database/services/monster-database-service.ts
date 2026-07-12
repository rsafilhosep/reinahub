import "server-only";
import { getItemImagePath, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { ServerAssetService } from "@/source/web/src/reina-core/assets/server-asset-service";
import { getReinaDatabaseSnapshot, ReinaDataService } from "@/source/web/src/reina-core/database";
import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";
import type { ReinaItem, ReinaMonsterLoot } from "@/source/web/src/reina-core/database";
import { TaxonomyService } from "@/source/web/src/reina-core/taxonomy";
import { createEmptyMonsterFutureData } from "../utils";
import type {
  MonsterAssetInfo,
  MonsterClassInfo,
  MonsterClassSummary,
  MonsterDatabaseRecord,
  MonsterLootEntry,
  MonsterRelatedItem,
  MonsterSearchResult
} from "../types";

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
      classInfo: getMonsterClassInfo(monster.name),
      image,
      loot,
      relatedItems,
      lootItemCount: loot.length,
      foundAssetCount,
      future: createEmptyMonsterFutureData()
    };
  },

  searchMonsters(query: string, creatureClass = ""): MonsterSearchResult[] {
    const normalizedClass = creatureClass.trim();
    const monsters = query.trim()
      ? ReinaDataService.searchMonsters(query)
      : getReinaDatabaseSnapshot().monsters.slice().sort((a, b) => a.name.localeCompare(b.name));

    return monsters
      .map((monster) => ({
        name: monster.name,
        experience: monster.experience,
        health: monster.health,
        classInfo: getMonsterClassInfo(monster.name),
        image: this.getMonsterImage(monster.name)
      }))
      .filter((monster) => !normalizedClass || monster.classInfo.id === normalizedClass)
      .slice(0, 80);
  },

  getClassSummary(): MonsterClassSummary[] {
    const snapshot = TaxonomyService.getSnapshot();
    const classes = new Map<string, MonsterClassSummary>();

    classes.set("", {
      id: "",
      label: "Todas",
      count: 0,
      expectedCount: null,
      isBestiaryClass: true
    });

    for (const creatureClass of snapshot.creatureClasses) {
      classes.set(creatureClass.id, {
        id: creatureClass.id,
        label: creatureClass.label,
        count: 0,
        expectedCount: creatureClass.expectedCount ?? null,
        isBestiaryClass: true
      });
    }

    classes.set("unclassified", {
      id: "unclassified",
      label: "Sem classe",
      count: 0,
      expectedCount: null,
      isBestiaryClass: false
    });

    for (const monster of getReinaDatabaseSnapshot().monsters) {
      const classInfo = getMonsterClassInfo(monster.name);
      const row = classes.get(classInfo.id) ?? classes.get("unclassified");
      if (row) row.count += 1;
      const all = classes.get("");
      if (all) all.count += 1;
    }

    return Array.from(classes.values());
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
      exists: ServerAssetService.publicAssetExists(imagePath)
    };
  }
};

function getMonsterClassInfo(monsterName: string): MonsterClassInfo {
  const classification = TaxonomyService.classifyMonster({ name: monsterName });
  const snapshot = TaxonomyService.getSnapshot();
  const bestiaryClass = classification.creatureClass
    ? snapshot.creatureClasses.find((creatureClass) => creatureClass.id === classification.creatureClass)
    : undefined;

  if (!bestiaryClass) {
    return {
      id: "unclassified",
      label: "Sem classe",
      confidence: "unclassified",
      matchedBy: classification.matchedBy,
      isBestiaryClass: false
    };
  }

  return {
    id: bestiaryClass.id,
    label: bestiaryClass.label,
    confidence: classification.confidence,
    matchedBy: classification.matchedBy,
    isBestiaryClass: true
  };
}

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
    hasImage: ServerAssetService.publicAssetExists(imagePath),
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
