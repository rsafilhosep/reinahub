export type TaxonomyEntry = {
  id: string;
  label: string;
  expectedCount?: number;
};

export type TaxonomyConfidence = "high" | "medium" | "low" | "unclassified";

export type ItemClassification = {
  itemId: number;
  name: string;
  category: string;
  slot?: string;
  weaponType?: string;
  confidence: TaxonomyConfidence;
  matchedBy: string;
};

export type MonsterClassification = {
  name: string;
  creatureClass?: string;
  confidence: TaxonomyConfidence;
  matchedBy: string;
};

export type TaxonomySnapshot = {
  creatureClasses: TaxonomyEntry[];
  itemCategories: TaxonomyEntry[];
  equipmentSlots: TaxonomyEntry[];
  weaponTypes: TaxonomyEntry[];
};
