import "server-only";
import priceSourceData from "./generated/npc-trade-price-sources.json";
import priceSourceGroupsData from "./generated/npc-trade-price-sources-grouped.json";
import { itemLookupKey } from "./normalize";
import type { ReinaNpcTradePriceGroup, ReinaNpcTradePriceRow, ReinaNpcTradePriceSource } from "./types";

type PriceSourcePayload = {
  generatedAt: string;
  sources: ReinaNpcTradePriceSource[];
  prices: ReinaNpcTradePriceRow[];
};

type PriceSourceGroupsPayload = {
  generatedAt: string;
  groups: ReinaNpcTradePriceGroup[];
};

const payload = priceSourceData as PriceSourcePayload;
const groupedPayload = priceSourceGroupsData as PriceSourceGroupsPayload;

export const NpcTradePriceSourceService = {
  getSources() {
    return payload.sources;
  },

  getAllPriceRows() {
    return payload.prices;
  },

  getGroupedPrices() {
    return groupedPayload.groups;
  },

  getPricesForNpc(npcName: string) {
    const normalizedNpcName = itemLookupKey(npcName);
    return groupedPayload.groups.filter((group) => group.normalizedNpcName === normalizedNpcName);
  },

  getPricesForItem(itemId: number | string) {
    const numericId = Number(itemId);
    if (!Number.isFinite(numericId)) return [];
    return groupedPayload.groups.filter((group) => group.itemId === numericId || group.clientId === numericId);
  },

  getActivePrice(group: ReinaNpcTradePriceGroup, preferredSourceId = "otserver-local") {
    return group.prices.find((price) => price.sourceId === preferredSourceId)?.price ?? group.activePrice;
  },

  getConflicts(severity?: "high" | "medium" | "low") {
    return groupedPayload.groups.filter((group) =>
      group.prices.some((price) => price.conflict && (!severity || price.conflict.severity === severity))
    );
  }
};
