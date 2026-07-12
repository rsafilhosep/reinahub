import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { HuntHistoryService, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import type { PremiumGoalCalculation } from "../types/premium-goals.types";
import type { VaultServer } from "@/types/vault";

const DEFAULT_SAMPLE_SIZE = 5;

export type GoalProgressEstimate = {
  sampleSize: number;
  huntsUsed: number;
  averageBalance: number;
  averageDurationHours: number;
  averageBalancePerHour: number;
  missingGold: number;
  missingPremium: number;
  estimatedHours: number | null;
  estimatedSessions: number | null;
  estimatedDaysAtThreeHours: number | null;
  sourceLabel: string;
};

export const GoalProgressEstimatorService = {
  estimatePremiumGoal(
    calculation: PremiumGoalCalculation | null,
    server: VaultServer | null,
    sampleSize = DEFAULT_SAMPLE_SIZE
  ): GoalProgressEstimate | null {
    if (!calculation || !server) return null;
    const records = HuntHistoryService.loadForActiveContext().slice(0, Math.max(1, sampleSize));
    return estimateFromRecords(calculation, server, records, sampleSize);
  }
};

function estimateFromRecords(
  calculation: PremiumGoalCalculation,
  server: VaultServer,
  records: HuntHistoryRecord[],
  sampleSize: number
): GoalProgressEstimate {
  const missingGold = calculation.missingGold;
  const totals = records.reduce(
    (acc, record) => {
      const durationHours = parseDurationHours(record.summary.sessionLength);
      return {
        balance: acc.balance + Math.max(0, record.summary.balance),
        durationHours: acc.durationHours + durationHours
      };
    },
    { balance: 0, durationHours: 0 }
  );
  const huntsUsed = records.length;
  const averageBalance = huntsUsed ? totals.balance / huntsUsed : 0;
  const averageDurationHours = huntsUsed ? totals.durationHours / huntsUsed : 0;
  const averageBalancePerHour = totals.durationHours > 0 ? totals.balance / totals.durationHours : 0;
  const estimatedHours = averageBalancePerHour > 0 ? missingGold / averageBalancePerHour : null;
  const estimatedSessions = averageBalance > 0 ? Math.ceil(missingGold / averageBalance) : null;

  return {
    sampleSize,
    huntsUsed,
    averageBalance,
    averageDurationHours,
    averageBalancePerHour,
    missingGold,
    missingPremium: ReinaEconomyService.goldToPremium(server, missingGold),
    estimatedHours,
    estimatedSessions,
    estimatedDaysAtThreeHours: estimatedHours !== null ? Math.ceil(estimatedHours / 3) : null,
    sourceLabel: huntsUsed ? `ultimas ${huntsUsed} hunt(s) deste contexto` : "sem hunts neste contexto"
  };
}

function parseDurationHours(value: string) {
  const normalized = value.trim().toLowerCase();
  const hourMinute = normalized.match(/(\d{1,3}):(\d{2})h?/);
  if (hourMinute) {
    return Number(hourMinute[1]) + Number(hourMinute[2]) / 60;
  }

  const hours = normalized.match(/(\d+(?:[,.]\d+)?)\s*h/);
  if (hours) return Number(hours[1].replace(",", "."));

  const minutes = normalized.match(/(\d+(?:[,.]\d+)?)\s*m/);
  if (minutes) return Number(minutes[1].replace(",", ".")) / 60;

  return 0;
}
