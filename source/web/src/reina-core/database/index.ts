import items from "./generated/items.json";
import monsters from "./generated/monsters.json";
import monsterLoot from "./generated/monster-loot.json";
import npcSellPrices from "./generated/npc-sell-prices.json";
export { ReinaDataService, getReinaDatabaseSnapshot } from "./reina-data-service";
export { itemLookupKey, normalizeItemName } from "./normalize";

export { items, monsters, monsterLoot, npcSellPrices };
export type { ReinaDatabaseValidation, ReinaItem, ReinaMonster, ReinaMonsterLoot, ReinaNpcSellPrice } from "./types";
