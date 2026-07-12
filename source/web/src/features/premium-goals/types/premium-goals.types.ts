export type PremiumProductAvailability = "permanent" | "event" | "temporary" | "unknown";

export type PremiumProduct = {
  id: string;
  name: string;
  category: string;
  defaultCost: number;
  availability: PremiumProductAvailability;
  eventName?: string;
  notes?: string;
};

export type PremiumProductOverride = {
  productId: string;
  serverId: string;
  cost: number;
  updatedAt: number;
};

export type PremiumGoalProgress = {
  productId: string;
  profileId: string | null;
  profileName: string | null;
  characterId: string | null;
  characterName: string | null;
  serverId: string | null;
  ownedPremium: number;
  updatedAt: number;
};

export type PremiumGoalCalculation = {
  product: PremiumProduct;
  cost: number;
  currencyName: string;
  ownedPremium: number;
  missingPremium: number;
  missingGold: number;
  missingBrlVenda: number;
  missingBrlCompra: number;
};
