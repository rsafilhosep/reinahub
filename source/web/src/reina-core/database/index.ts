import items from "./generated/items.json";
import monsters from "./generated/monsters.json";
import monsterLoot from "./generated/monster-loot.json";
import npcs from "./generated/npcs.json";
import npcSellPrices from "./generated/npc-sell-prices.json";
import npcTrades from "./generated/npc-trades.json";
import npcTradePriceSources from "./generated/npc-trade-price-sources.json";
import npcTradePriceSourceGroups from "./generated/npc-trade-price-sources-grouped.json";
import supplementalItems from "./generated/supplemental-items.json";
export { ReinaDataService, getReinaDatabaseSnapshot } from "./reina-data-service";
export { NpcTradePriceSourceService } from "./npc-trade-price-source-service";
export { itemLookupKey, normalizeItemName } from "./normalize";

export { items, monsters, monsterLoot, npcs, npcSellPrices, npcTrades, npcTradePriceSources, npcTradePriceSourceGroups, supplementalItems };
export type {
  ReinaDatabaseValidation,
  ReinaItem,
  ReinaMonster,
  ReinaMonsterLoot,
  ReinaNpc,
  ReinaNpcSellPrice,
  ReinaNpcTrade,
  ReinaNpcTradePriceGroup,
  ReinaNpcTradePriceRow,
  ReinaNpcTradePriceSource
} from "./types";
