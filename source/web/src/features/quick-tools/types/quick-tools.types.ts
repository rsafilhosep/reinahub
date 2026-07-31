export type QuickConverterMode = "gold" | "premium" | "brl";

export type QuickGoalMode = "premium" | "gold";

export type QuickXpGoalMode = "manual" | "level";

export type QuickConversionResult = {
  gold: number;
  premium: number;
  sellBrl: number;
  buyBrl: number;
};

export type QuickGoalResult = {
  totalGold: number;
  currentGold: number;
  missingGold: number;
  missingPremium: number;
  missingBrlCompra: number;
  progressPct: number;
};

export type QuickLevelGoalResult = {
  currentLevel: number;
  targetLevel: number;
  currentExperience: number;
  targetExperience: number;
  missingXp: number;
};
