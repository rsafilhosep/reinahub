import "server-only";
import fs from "node:fs";
import path from "node:path";
import { getItemImagePath, getNpcImagePath } from "@/source/web/src/reina-core/assets";
import { getReinaDatabaseSnapshot, itemLookupKey, ReinaDataService } from "@/source/web/src/reina-core/database";
import { createEmptyNpcFutureData } from "../utils";
import type { NpcAssetInfo, NpcHubRecord, NpcLocationInfo, NpcRelatedItem, NpcSearchResult } from "../types";

const publicDir = path.join(process.cwd(), "public");
const assetExistsCache = new Map<string, boolean>();

const npcSeeds = [
  {
    name: "NPC Price Reference",
    description: "Imported NPC buyer price list",
    city: null as string | null
  }
];

export const NpcHubService = {
  getNpc(name: string): NpcHubRecord | null {
    const seed = findNpcSeed(name);
    if (!seed) return null;

    const itemsBought = this.getItemsBought(seed.name);
    const itemsSold = this.getItemsSold(seed.name);

    return {
      name: seed.name,
      normalizedName: itemLookupKey(seed.name),
      image: this.getNpcImage(seed.name),
      location: this.getNpcLocation(seed.name),
      itemsBought,
      itemsSold,
      itemsBoughtCount: itemsBought.length,
      itemsSoldCount: itemsSold.length,
      future: createEmptyNpcFutureData()
    };
  },

  searchNpcs(query: string): NpcSearchResult[] {
    const normalizedQuery = itemLookupKey(query);
    if (!normalizedQuery) return [];

    return npcSeeds
      .filter((npc) => itemLookupKey(npc.name).includes(normalizedQuery))
      .map((npc) => {
        const itemsBought = this.getItemsBought(npc.name);
        const itemsSold = this.getItemsSold(npc.name);
        return {
          name: npc.name,
          normalizedName: itemLookupKey(npc.name),
          image: this.getNpcImage(npc.name),
          city: this.getNpcLocation(npc.name).city,
          itemsBoughtCount: itemsBought.length,
          itemsSoldCount: itemsSold.length
        };
      });
  },

  getItemsBought(npc: string): NpcRelatedItem[] {
    const seed = findNpcSeed(npc);
    if (!seed) return [];

    const { npcSellPrices } = getReinaDatabaseSnapshot();
    return npcSellPrices.map((price) => {
      const item = price.itemId ? ReinaDataService.findItemById(price.itemId) : price.itemName ? ReinaDataService.findItemByName(price.itemName) : null;
      const itemId = item?.id ?? price.itemId ?? null;
      const itemName = item?.name ?? price.itemName ?? "Unknown item";
      const imagePath = itemId ? getItemImagePath(itemId) : getItemImagePath(null);

      return {
        itemId,
        itemName,
        price: price.sellPrice,
        imagePath,
        hasImage: publicAssetExists(imagePath),
        itemHref: itemId ? `/items?itemId=${itemId}` : null
      };
    });
  },

  getItemsSold(npc: string): NpcRelatedItem[] {
    const seed = findNpcSeed(npc);
    return seed ? [] : [];
  },

  getNpcImage(name: string): NpcAssetInfo {
    const imagePath = getNpcImagePath(name);
    return {
      path: imagePath,
      exists: publicAssetExists(imagePath)
    };
  },

  getNpcLocation(name: string): NpcLocationInfo {
    const seed = findNpcSeed(name);
    return {
      city: seed?.city ?? null,
      coordinates: null
    };
  }
};

function findNpcSeed(name: string) {
  const normalizedName = itemLookupKey(name);
  return npcSeeds.find((npc) => itemLookupKey(npc.name) === normalizedName) ?? null;
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
