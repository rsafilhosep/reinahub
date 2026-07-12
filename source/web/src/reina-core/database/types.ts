export type ReinaItem = {
  id: number;
  name: string;
  clientId?: number;
  sellPrice?: number;
  dataSource?: "items.xml" | "supplemental";
  provenance?: {
    source: string;
    sourceType: string;
    confidence: "high" | "medium" | "low";
    note?: string;
  };
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

export type ReinaNpc = {
  name: string;
  normalizedName: string;
  sourcePath: string;
  city?: string;
};

export type ReinaNpcTrade = {
  npcName: string;
  normalizedNpcName: string;
  itemId?: number;
  clientId?: number;
  itemName: string;
  tradeType: "npcBuys" | "npcSells";
  price: number;
  count?: number;
  sourcePath: string;
  dataStatus: "matched" | "unmatched";
};

export type ReinaNpcTradePriceSource = {
  id: string;
  label: string;
  type: "local" | "external-reference" | "manual";
  priority: number;
  activeByDefault: boolean;
  description?: string;
};

export type ReinaNpcTradePriceRow = {
  sourceId: string;
  npcName: string;
  normalizedNpcName: string;
  itemId: number | null;
  clientId: number | null;
  itemName: string;
  normalizedItemName: string;
  tradeType: "npcBuys" | "npcSells";
  price: number;
  sourcePath: string;
  sourceUrl: string | null;
  confidence: "high" | "medium" | "low";
  status: "active" | "reference" | "new-candidate" | "merge-candidate" | "conflict-review";
  conflict?: {
    localPrice: number;
    sourcePrice: number;
    severity: "high" | "medium" | "low";
    ratio: number;
    likelyCause: string;
  } | null;
};

export type ReinaNpcTradePriceGroup = {
  npcName: string;
  normalizedNpcName: string;
  itemId: number | null;
  clientId: number | null;
  itemName: string;
  normalizedItemName: string;
  tradeType: "npcBuys" | "npcSells";
  prices: Array<{
    sourceId: string;
    price: number;
    confidence: "high" | "medium" | "low";
    status: string;
    sourcePath: string;
    sourceUrl: string | null;
    conflict?: ReinaNpcTradePriceRow["conflict"];
  }>;
  hasConflict: boolean;
  activePrice: number | null;
};

export type ReinaDatabaseValidation = {
  duplicateItemNames: string[];
  duplicateItemIds: number[];
  lootWithoutItem: ReinaMonsterLoot[];
  npcPricesWithoutItem: ReinaNpcSellPrice[];
};
