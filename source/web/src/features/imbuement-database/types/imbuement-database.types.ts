export type ImbuementTier = "basic" | "intricate" | "powerful";

export type ImbuementMaterialDefinition = {
  itemName: string;
  count: number;
};

export type ImbuementDefinition = {
  id: string;
  name: string;
  group: string;
  tier: ImbuementTier;
  effect: string;
  materials: ImbuementMaterialDefinition[];
};

export type ImbuementMaterial = ImbuementMaterialDefinition & {
  itemId: number | null;
  resolvedName: string;
  npcPrice: number | null;
  totalNpcValue: number | null;
  imagePath: string;
  hasImage: boolean;
  itemHref: string | null;
  droppedBy: Array<{
    monsterName: string;
    normalizedName: string;
    experience: number | null;
    health: number | null;
    imagePath: string;
    hasImage: boolean;
    chance: number | null;
    maxCount: number | null;
  }>;
  droppedByCount: number;
  dataStatus: "matched" | "unmatched";
};

export type ItemImbuementUsage = {
  imbuementId: string;
  imbuementName: string;
  group: string;
  tier: ImbuementTier;
  materialCount: number;
  requiredCount: number;
  effect: string;
};

export type ImbuementRecord = {
  id: string;
  name: string;
  group: string;
  tier: ImbuementTier;
  effect: string;
  materials: ImbuementMaterial[];
  materialCount: number;
  matchedMaterialCount: number;
  totalNpcCost: number | null;
  future: {
    marketCost: null;
    history: [];
    profitSimulation: null;
    vocations: [];
    equipmentSlots: [];
    npc: null;
    wikiUrl: null;
  };
};

export type ImbuementSearchResult = {
  id: string;
  name: string;
  group: string;
  tier: ImbuementTier;
  materialCount: number;
  totalNpcCost: number | null;
};
