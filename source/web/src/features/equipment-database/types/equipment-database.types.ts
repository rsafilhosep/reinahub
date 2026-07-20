export type EquipmentCategory =
  | "weapon"
  | "shield"
  | "armor"
  | "helmet"
  | "legs"
  | "boots"
  | "amulet"
  | "ring"
  | "container";

export type EquipmentWeaponType =
  | "sword"
  | "axe"
  | "club"
  | "fist"
  | "distance"
  | "wand"
  | "rod"
  | "ammo";

export type EquipmentSourceStatus = "seed" | "imported" | "manual-review";

export type EquipmentSeedRecord = {
  id: string;
  name: string;
  category: EquipmentCategory;
  slot: string;
  weaponType?: EquipmentWeaponType;
  level?: number;
  vocations?: string[];
  hands?: number;
  attack?: number;
  defense?: number;
  armor?: number;
  element?: string;
  range?: number;
  hitModifier?: number;
  speed?: number;
  imbuementSlots?: number;
  tier?: number | null;
  weightOz?: number;
  sourceUrl?: string;
  sourcePath?: string;
  sourceStatus: EquipmentSourceStatus;
};

export type EquipmentAssetInfo = {
  path: string;
  exists: boolean;
};

export type EquipmentRecord = EquipmentSeedRecord & {
  itemId: number | null;
  clientId: number | null;
  npcPrice: number | null;
  image: EquipmentAssetInfo;
  sourceLabel: string;
  future: EquipmentFutureData;
};

export type EquipmentSearchResult = {
  id: string;
  name: string;
  category: EquipmentCategory;
  weaponType?: EquipmentWeaponType;
  hands: number | null;
  level: number | null;
  requiredLevel: number | null;
  isUsableAtLevel: boolean;
  attack: number | null;
  defense: number | null;
  armor: number | null;
  imbuementSlots: number | null;
  weightOz: number | null;
  vocations: string[];
  itemId: number | null;
  image: EquipmentAssetInfo;
};

export type EquipmentCompareMetric = {
  key: string;
  label: string;
  leftValue: string;
  rightValue: string;
  winner: "left" | "right" | "tie" | "none";
  preference: "higher" | "lower" | "equal";
};

export type EquipmentComparison = {
  left: EquipmentRecord;
  right: EquipmentRecord;
  metrics: EquipmentCompareMetric[];
  summary: string[];
};

export type EquipmentFutureData = {
  market: null;
  priceHistory: [];
  setSynergy: [];
  imbuements: [];
  vocationRecommendations: [];
  huntingProfiles: [];
  upgradePath: [];
  forge: null;
  wikiSnapshot: null;
};
