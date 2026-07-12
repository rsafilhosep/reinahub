export type MonsterFutureData = {
  bestiary: null;
  charms: string[];
  spawn: null;
  respawn: null;
  resistances: Record<string, number>;
  weaknesses: Record<string, number>;
  relatedBoss: null;
  location: null;
  map: null;
  strategies: string[];
  recommendedVocations: string[];
  averageProfit: null;
};

export type MonsterAssetInfo = {
  path: string;
  exists: boolean;
};

export type MonsterClassInfo = {
  id: string;
  label: string;
  confidence: "high" | "medium" | "low" | "unclassified";
  matchedBy: string;
  isBestiaryClass: boolean;
};

export type MonsterClassSummary = {
  id: string;
  label: string;
  count: number;
  expectedCount: number | null;
  isBestiaryClass: boolean;
};

export type MonsterRelatedItem = {
  id: number | null;
  name: string;
  sellPrice: number | null;
  imagePath: string;
  hasImage: boolean;
};

export type MonsterLootEntry = {
  monsterName: string;
  itemId: number | null;
  itemName: string;
  chance: number | null;
  maxCount: number | null;
  sellPrice: number | null;
  imagePath: string;
  hasImage: boolean;
  dataStatus: "matched" | "unmatched";
};

export type MonsterDatabaseRecord = {
  name: string;
  experience: number;
  health: number;
  speed: number;
  classInfo: MonsterClassInfo;
  image: MonsterAssetInfo;
  loot: MonsterLootEntry[];
  relatedItems: MonsterRelatedItem[];
  lootItemCount: number;
  foundAssetCount: number;
  future: MonsterFutureData;
};

export type MonsterSearchResult = {
  name: string;
  experience: number;
  health: number;
  classInfo: MonsterClassInfo;
  image: MonsterAssetInfo;
};
