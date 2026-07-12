export type LiveGoalType = "premium" | "mount" | "outfit" | "bless" | "item" | "creature" | "custom";

export type LiveGoalCurrency = "Tibia Coin" | "RC" | "gold" | "real" | "kill";

export type LiveGoalTheme = "royal" | "emerald" | "arcane";

export type LiveGoal = {
  id: string;
  profileId?: string | null;
  profileName?: string | null;
  characterId?: string | null;
  characterName?: string | null;
  serverId?: string | null;
  itemName: string;
  type: LiveGoalType;
  currency: LiveGoalCurrency;
  total: number;
  current: number;
  showCreatureGoal: boolean;
  creatureName: string;
  creatureTotal: number;
  creatureCurrent: number;
  creatureImageUrl: string;
  bestiarySlots: LiveBestiarySlot[];
  customText: string;
  imageUrl: string;
  showBrl: boolean;
  showGold: boolean;
  theme: LiveGoalTheme;
  updatedAt: number;
};

export type LiveBestiarySlot = {
  id: string;
  name: string;
  total: number;
  current: number;
  imageUrl?: string;
};

export type LiveGoalCalculation = {
  goal: LiveGoal;
  serverName: string;
  currencyName: string;
  unitLabel: string;
  isKillGoal: boolean;
  total: number;
  current: number;
  missing: number;
  progressPct: number;
  totalGold: number;
  currentGold: number;
  missingGold: number;
  totalBrlVenda: number;
  missingBrlVenda: number;
  creatureGoal: LiveCreatureGoalCalculation | null;
  bestiarySlots: LiveCreatureGoalCalculation[];
};

export type LiveCreatureGoalCalculation = {
  name: string;
  imageUrl: string;
  total: number;
  current: number;
  missing: number;
  progressPct: number;
};
