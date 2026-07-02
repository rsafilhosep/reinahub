import type { ItemFutureData } from "../types";

export function createEmptyItemFutureData(): ItemFutureData {
  return {
    market: null,
    priceHistory: [],
    sellerNpcs: [],
    buyerNpcs: [],
    quests: [],
    imbuements: [],
    bestiary: null,
    charms: [],
    crafts: [],
    trade: null,
    statistics: null
  };
}
