export type ReinaItem = {
  id: number;
  name: string;
  clientId?: number;
  sellPrice?: number;
};

export type ReinaMonster = {
  name: string;
  experience: number;
  health: number;
  speed: number;
  loot: ReinaMonsterLoot[];
};

export type ReinaMonsterLoot = {
  monsterName: string;
  itemId?: number;
  itemName?: string;
  chance?: number;
  maxCount?: number;
};

export type ReinaNpcSellPrice = {
  itemId?: number;
  itemName?: string;
  sellPrice: number;
};

export type ReinaDatabaseValidation = {
  duplicateItemNames: string[];
  duplicateItemIds: number[];
  lootWithoutItem: ReinaMonsterLoot[];
  npcPricesWithoutItem: ReinaNpcSellPrice[];
};
