"use client";

import { StorageService } from "@/services/storage-service";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { MarketAnalysis, VaultServer } from "@/types/vault";

const MARKET_HISTORY_KEY = "ma_history";

export type MarketAnalysisInput = {
  itemId?: number | null;
  itemImagePath?: string | null;
  nome: string;
  qtd: number;
  npcUnit: number;
  marketUnit: number;
  taxaPct: number;
  marketMinProfitPct?: number;
  marketMinProfitGp?: number;
};

export type MarketEconomySummary = {
  analysis: MarketAnalysis;
  bestGp: number;
  premium: number;
  brl: number;
  bestOption: "market" | "npc";
};

export const MarketEconomyService = {
  loadHistory() {
    return StorageService.get<MarketAnalysis[]>(MARKET_HISTORY_KEY, []);
  },

  saveHistory(history: MarketAnalysis[]) {
    StorageService.set(MARKET_HISTORY_KEY, history);
  },

  clearHistory() {
    StorageService.remove(MARKET_HISTORY_KEY);
  },

  saveAnalysis(history: MarketAnalysis[], analysis: MarketAnalysis) {
    const next = [...history, { ...analysis, ts: Date.now() }].slice(-50);
    this.saveHistory(next);
    return next;
  },

  summarize(input: MarketAnalysisInput, server: VaultServer | null): MarketEconomySummary {
    const qtd = normalizeNumber(input.qtd);
    const npcUnit = normalizeNumber(input.npcUnit);
    const marketUnit = normalizeNumber(input.marketUnit);
    const taxaPct = normalizeNumber(input.taxaPct);
    const marketMinProfitPct = Math.max(0, normalizeNumber(input.marketMinProfitPct ?? 5));
    const marketMinProfitGp = Math.max(0, normalizeNumber(input.marketMinProfitGp ?? 0));
    const npcTotal = qtd * npcUnit;
    const marketBruto = qtd * marketUnit;
    const taxaValor = marketBruto * (taxaPct / 100);
    const marketLiquido = marketBruto - taxaValor;
    const diffAbs = marketLiquido - npcTotal;
    const diffPct = npcTotal > 0 ? (diffAbs / npcTotal) * 100 : 0;
    const enoughPct = marketMinProfitPct <= 0 || diffPct >= marketMinProfitPct;
    const enoughGp = marketMinProfitGp <= 0 || diffAbs >= marketMinProfitGp;
    const recommendMarket = diffAbs > 0 && enoughPct && enoughGp;
    const bestOption = recommendMarket ? "market" : "npc";
    const bestGp = bestOption === "market" ? marketLiquido : npcTotal;
    const premium = ReinaEconomyService.goldToPremium(server, bestGp);
    const recommendationReason = getRecommendationReason({
      bestOption,
      diffAbs,
      diffPct,
      marketMinProfitPct,
      marketMinProfitGp
    });

    return {
      analysis: {
        itemId: input.itemId ?? null,
        itemImagePath: input.itemImagePath ?? null,
        nome: input.nome,
        qtd,
        npcUnit,
        marketUnit,
        taxaPct,
        npcTotal,
        marketBruto,
        taxaValor,
        marketLiquido,
        diffAbs,
        diffPct,
        marketMinProfitPct,
        marketMinProfitGp,
        recommendedOption: bestOption,
        recommendationReason,
        ts: Date.now()
      },
      bestGp,
      premium,
      brl: ReinaEconomyService.premiumToBrl(server, premium, "venda"),
      bestOption
    };
  }
};

function normalizeNumber(value: number) {
  return Number.isFinite(value) ? value : 0;
}

function getRecommendationReason({
  bestOption,
  diffAbs,
  diffPct,
  marketMinProfitPct,
  marketMinProfitGp
}: {
  bestOption: "market" | "npc";
  diffAbs: number;
  diffPct: number;
  marketMinProfitPct: number;
  marketMinProfitGp: number;
}) {
  if (bestOption === "market") {
    return "Market supera a vantagem minima configurada.";
  }
  if (diffAbs <= 0) {
    return "NPC e mais seguro porque o Market liquido nao supera o valor NPC.";
  }
  if (diffPct < marketMinProfitPct) {
    return `NPC e mais seguro: ganho de Market abaixo de ${marketMinProfitPct}%.`;
  }
  if (marketMinProfitGp > 0 && diffAbs < marketMinProfitGp) {
    return `NPC e mais seguro: ganho de Market abaixo de ${marketMinProfitGp} gp.`;
  }
  return "NPC e mais seguro para empate ou ganho pequeno.";
}
