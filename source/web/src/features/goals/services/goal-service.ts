import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { getExperienceForLevel } from "@/source/web/src/features/character-profile/services/character-profile-service";
import type {
  ReinaGoalCalculation,
  ReinaGoalCurrency,
  ReinaGoalDefinition,
  ReinaGoalEconomyInput,
  ReinaKillGoalCalculation,
  ReinaLevelGoalInput
} from "../types/goal.types";

export const GoalService = {
  calculateGoal(goal: ReinaGoalDefinition, economy: ReinaGoalEconomyInput): ReinaGoalCalculation {
    const total = safeNumber(goal.total);
    const current = safeNumber(goal.current);
    const missing = Math.max(0, total - current);
    const totalGold = toGold(goal.currency, total, economy);
    const currentGold = toGold(goal.currency, current, economy);
    const missingGold = Math.max(0, totalGold - currentGold);

    return {
      goalId: goal.id,
      name: goal.name,
      kind: goal.kind,
      currency: goal.currency,
      total,
      current,
      missing,
      progressPct: progressPercent(current, total),
      totalGold,
      currentGold,
      missingGold,
      totalPremium: ReinaEconomyService.goldToPremium(economy.server, totalGold),
      currentPremium: ReinaEconomyService.goldToPremium(economy.server, currentGold),
      missingPremium: ReinaEconomyService.goldToPremium(economy.server, missingGold),
      totalBrlVenda: ReinaEconomyService.goldToBrl(economy.server, totalGold, "venda"),
      missingBrlVenda: ReinaEconomyService.goldToBrl(economy.server, missingGold, "venda"),
      missingBrlCompra: ReinaEconomyService.goldToBrl(economy.server, missingGold, "compra")
    };
  },

  calculateMoneyGoal(economy: ReinaGoalEconomyInput, currency: ReinaGoalCurrency, total: number, current: number, name = "Objetivo") {
    return this.calculateGoal(
      {
        id: "goal-preview",
        name,
        kind: currency === "gold" ? "gold" : currency === "brl" ? "brl" : "premium",
        currency,
        total,
        current,
        updatedAt: Date.now()
      },
      economy
    );
  },

  calculateLevelGoal(input: ReinaLevelGoalInput) {
    const currentLevel = Math.max(1, Math.trunc(safeNumber(input.currentLevel) || 1));
    const targetLevel = Math.max(currentLevel + 1, Math.trunc(safeNumber(input.targetLevel) || currentLevel + 1));
    const currentLevelExperience = getExperienceForLevel(currentLevel);
    const targetExperience = getExperienceForLevel(targetLevel);
    const currentExperience = Math.max(currentLevelExperience, Math.trunc(safeNumber(input.currentExperience) || currentLevelExperience));
    const missingXp = Math.max(0, targetExperience - currentExperience);
    const totalSpan = Math.max(1, targetExperience - currentLevelExperience);
    const gainedSpan = Math.max(0, currentExperience - currentLevelExperience);

    return {
      currentLevel,
      targetLevel,
      currentExperience,
      targetExperience,
      missingXp,
      progressPct: progressPercent(gainedSpan, totalSpan)
    };
  },

  calculateKillGoal(name: string, total: number, current: number, imagePath?: string | null): ReinaKillGoalCalculation {
    const safeTotal = safeNumber(total);
    const safeCurrent = safeNumber(current);
    return {
      name: name.trim() || "Criatura",
      total: safeTotal,
      current: safeCurrent,
      missing: Math.max(0, safeTotal - safeCurrent),
      progressPct: progressPercent(safeCurrent, safeTotal),
      imagePath: imagePath ?? null
    };
  },

  calculateKillsNeeded(missingXp: number, xpPerKill: number) {
    const xp = safeNumber(xpPerKill);
    return safeNumber(missingXp) > 0 && xp > 0 ? Math.ceil(safeNumber(missingXp) / xp) : null;
  },

  calculateItemsNeeded(missingGold: number, unitGoldPrice: number) {
    const price = safeNumber(unitGoldPrice);
    return safeNumber(missingGold) > 0 && price > 0 ? Math.ceil(safeNumber(missingGold) / price) : null;
  },

  progressPercent
};

function toGold(currency: ReinaGoalCurrency, value: number, economy: ReinaGoalEconomyInput) {
  if (currency === "gold" || currency === "item") return safeNumber(value);
  if (currency === "premium") return ReinaEconomyService.premiumToGold(economy.server, value);
  if (currency === "brl") return ReinaEconomyService.brlToGold(economy.server, value, "compra");
  return 0;
}

function progressPercent(current: number, total: number) {
  const safeTotal = safeNumber(total);
  if (safeTotal <= 0) return 0;
  return Math.min(100, Math.max(0, (safeNumber(current) / safeTotal) * 100));
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
