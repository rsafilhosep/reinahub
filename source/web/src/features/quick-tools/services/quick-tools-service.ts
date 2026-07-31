import { parseGameNumber } from "@/services/format";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";
import { GoalService } from "@/source/web/src/features/goals/services";
import type { QuickConverterMode, QuickGoalMode } from "../types/quick-tools.types";

export const QuickToolsService = {
  calculateConversion(economy: ReinaEconomyContext | null, mode: QuickConverterMode, rawValue: string) {
    const server = economy?.server ?? null;
    const value = mode === "gold" ? parseGameNumber(rawValue) : parseFlexibleDecimal(rawValue);

    const gold =
      mode === "gold"
        ? value
        : mode === "premium"
          ? ReinaEconomyService.premiumToGold(server, value)
          : ReinaEconomyService.brlToGold(server, value, "compra");

    const premium =
      mode === "premium"
        ? value
        : mode === "brl"
          ? ReinaEconomyService.brlToPremium(server, value, "compra")
          : ReinaEconomyService.goldToPremium(server, gold);

    return {
      gold,
      premium,
      sellBrl: ReinaEconomyService.premiumToBrl(server, premium, "venda"),
      buyBrl: ReinaEconomyService.premiumToBrl(server, premium, "compra")
    };
  },

  calculateGoal(economy: ReinaEconomyContext | null, mode: QuickGoalMode, totalValue: string, currentValue: string) {
    const total = mode === "gold" ? parseGameNumber(totalValue) : parseFlexibleDecimal(totalValue);
    const current = mode === "gold" ? parseGameNumber(currentValue) : parseFlexibleDecimal(currentValue);
    return GoalService.calculateMoneyGoal({ server: economy?.server ?? null }, mode === "gold" ? "gold" : "premium", total, current, "Objetivo rapido");
  },

  calculateLevelGoal(currentLevelValue: string, targetLevelValue: string, currentExperienceValue: string) {
    return GoalService.calculateLevelGoal({
      currentLevel: parseGameNumber(currentLevelValue),
      targetLevel: parseGameNumber(targetLevelValue),
      currentExperience: parseGameNumber(currentExperienceValue)
    });
  },

  calculateKillsNeeded(missingXp: number, xpPerKill: number) {
    return GoalService.calculateKillsNeeded(missingXp, xpPerKill);
  },

  calculateItemsNeeded(missingGold: number, unitGoldPrice: number) {
    return GoalService.calculateItemsNeeded(missingGold, unitGoldPrice);
  },

  parseFlexibleDecimal
};

function parseFlexibleDecimal(value: string) {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned) return 0;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", ".")) || 0;
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, "")) || 0;
  }

  return Number(cleaned) || 0;
}
