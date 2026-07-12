import "server-only";
import { getItemImagePath, getNpcImagePath } from "@/source/web/src/reina-core/assets";
import { ServerAssetService } from "@/source/web/src/reina-core/assets/server-asset-service";
import { getReinaDatabaseSnapshot, ReinaDataService } from "@/source/web/src/reina-core/database";
import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";
import { rankSearchResults } from "@/source/web/src/reina-core/search";
import type { ReinaNpc, ReinaNpcTrade } from "@/source/web/src/reina-core/database";
import { createEmptyNpcFutureData } from "../utils";
import type { NpcAssetInfo, NpcHubRecord, NpcLocationInfo, NpcRelatedItem, NpcSearchResult } from "../types";

const npcSeeds = [
  {
    name: "NPC Price Reference",
    description: "Imported NPC buyer price list",
    city: null as string | null
  }
];

export const NpcHubService = {
  getNpc(name: string): NpcHubRecord | null {
    const npc = findNpc(name);
    if (!npc) return null;

    const itemsBought = this.getItemsBought(npc.name);
    const itemsSold = this.getItemsSold(npc.name);

    return {
      name: npc.name,
      normalizedName: itemLookupKey(npc.name),
      image: this.getNpcImage(npc.name),
      location: this.getNpcLocation(npc.name),
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

    const realNpcs = ReinaDataService.searchNpcs(query);
    const seedMatches = rankSearchResults(npcSeeds, query, (npc) => npc.name);
    const merged = rankSearchResults(
      [...realNpcs, ...seedMatches].filter((npc, index, list) => list.findIndex((candidate) => itemLookupKey(candidate.name) === itemLookupKey(npc.name)) === index),
      query,
      (npc) => npc.name,
      50
    );

    return merged
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
    const realNpc = ReinaDataService.getNpcByName(npc);
    if (realNpc) {
      return ReinaDataService.getNpcTrades(realNpc.name)
        .filter((trade) => trade.tradeType === "npcBuys")
        .map((trade) => tradeToRelatedItem(trade));
    }

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
        tradeType: "reference",
        imagePath,
        hasImage: ServerAssetService.publicAssetExists(imagePath),
        itemHref: itemId ? `/items?itemId=${itemId}` : null
      };
    });
  },

  getItemsSold(npc: string): NpcRelatedItem[] {
    const realNpc = ReinaDataService.getNpcByName(npc);
    if (!realNpc) return [];

    return ReinaDataService.getNpcTrades(realNpc.name)
      .filter((trade) => trade.tradeType === "npcSells")
      .map((trade) => tradeToRelatedItem(trade));
  },

  getNpcImage(name: string): NpcAssetInfo {
    const imagePath = getNpcImagePath(name);
    return {
      path: imagePath,
      exists: ServerAssetService.publicAssetExists(imagePath)
    };
  },

  getNpcLocation(name: string): NpcLocationInfo {
    const npc = findNpc(name);
    return {
      city: npc?.city ?? null,
      coordinates: null
    };
  }
};

function findNpc(name: string): ReinaNpc | { name: string; city: string | null } | null {
  return ReinaDataService.getNpcByName(name) ?? findNpcSeed(name);
}

function findNpcSeed(name: string) {
  const normalizedName = itemLookupKey(name);
  return npcSeeds.find((npc) => itemLookupKey(npc.name) === normalizedName) ?? null;
}

function tradeToRelatedItem(trade: ReinaNpcTrade): NpcRelatedItem {
  const item = trade.itemId ? ReinaDataService.findItemById(trade.itemId) : ReinaDataService.findItemByName(trade.itemName);
  const itemId = item?.id ?? trade.itemId ?? null;
  const itemName = item?.name ?? trade.itemName;
  const imagePath = itemId ? getItemImagePath(itemId) : getItemImagePath(null);

  return {
    itemId,
    itemName,
    price: trade.price,
    tradeType: trade.tradeType,
    imagePath,
    hasImage: ServerAssetService.publicAssetExists(imagePath),
    itemHref: itemId ? `/items?itemId=${itemId}` : null
  };
}
