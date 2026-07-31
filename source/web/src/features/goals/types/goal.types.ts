import type { VaultServer } from "@/types/vault";

export type ReinaGoalKind = "premium" | "gold" | "brl" | "xp" | "level" | "bestiary" | "item" | "custom";

export type ReinaGoalCurrency = "premium" | "gold" | "brl" | "xp" | "kill" | "item";

export type ReinaGoalScope = {
  profileId?: string | null;
  profileName?: string | null;
  characterId?: string | null;
  characterName?: string | null;
  serverId?: string | null;
};

export type ReinaGoalProgress = {
  total: number;
  current: number;
};

export type ReinaGoalDefinition = ReinaGoalScope & {
  id: string;
  name: string;
  kind: ReinaGoalKind;
  currency: ReinaGoalCurrency;
  total: number;
  current: number;
  itemId?: number | null;
  itemName?: string | null;
  monsterName?: string | null;
  imagePath?: string | null;
  notes?: string;
  updatedAt: number;
};

export type ReinaGoalCalculation = {
  goalId: string;
  name: string;
  kind: ReinaGoalKind;
  currency: ReinaGoalCurrency;
  total: number;
  current: number;
  missing: number;
  progressPct: number;
  totalGold: number;
  currentGold: number;
  missingGold: number;
  totalPremium: number;
  currentPremium: number;
  missingPremium: number;
  totalBrlVenda: number;
  missingBrlVenda: number;
  missingBrlCompra: number;
};

export type ReinaLevelGoalInput = {
  currentLevel: number;
  targetLevel: number;
  currentExperience: number;
};

export type ReinaLevelGoalCalculation = {
  currentLevel: number;
  targetLevel: number;
  currentExperience: number;
  targetExperience: number;
  missingXp: number;
  progressPct: number;
};

export type ReinaKillGoalCalculation = {
  name: string;
  total: number;
  current: number;
  missing: number;
  progressPct: number;
  imagePath?: string | null;
};

export type ReinaGoalEconomyInput = {
  server: VaultServer | null;
};
