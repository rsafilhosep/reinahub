"use client";

import { ItemPriceMemoryService, type ItemPriceMemorySuggestion } from "@/source/web/src/reina-core/prices";
import type { VaultServer } from "@/types/vault";
import type { ImbuementRecord } from "../types";
import { ImbuementMarketService, type ImbuementMarketPriceMap, type ImbuementMarketSummary } from "./imbuement-market-service";

type ImbuementInsightMaterialLike = {
  itemId?: number | null;
  resolvedName?: string | null;
  itemName?: string | null;
  Name?: string | null;
  droppedByCount?: number | null;
  dataStatus?: "matched" | "unmatched";
};

export type ImbuementMaterialInsight = {
  status: "balanced" | "market-only" | "farm-only" | "needs-price" | "missing-data";
  label: string;
  description: string;
  hasMarketPrice: boolean;
  canFarm: boolean;
};

export type ImbuementWorkflowSummary = ImbuementMarketSummary & {
  npcPricedCount: number;
  npcReferenceTotal: number | null;
  farmableCount: number;
  buyableCount: number;
  missingDataCount: number;
  readyToCalculate: boolean;
  nextAction: string;
};

export const ImbuementInsightService = {
  summarizeWorkflow(imbuement: ImbuementRecord | null, prices: ImbuementMarketPriceMap, server: VaultServer | null): ImbuementWorkflowSummary {
    if (!imbuement) {
      return {
        pricedCount: 0,
        total: null,
        missingCount: 0,
        premium: 0,
        brl: 0,
        npcPricedCount: 0,
        npcReferenceTotal: null,
        farmableCount: 0,
        buyableCount: 0,
        missingDataCount: 0,
        readyToCalculate: false,
        nextAction: "Escolha um imbuement para revisar materiais e custos."
      };
    }

    const marketSummary = ImbuementMarketService.summarizeImbuement(imbuement, prices, server);
    const npcPricedValues = imbuement.materials
      .map((material) => material.totalNpcValue)
      .filter((value): value is number => value !== null);
    const materialInsights = imbuement.materials.map((material) =>
      this.getMaterialInsight(material, prices[ImbuementMarketService.getMaterialPriceKey(material)])
    );
    const missingDataCount = materialInsights.filter((insight) => insight.status === "missing-data").length;

    return {
      ...marketSummary,
      npcPricedCount: npcPricedValues.length,
      npcReferenceTotal: npcPricedValues.length === imbuement.materials.length ? npcPricedValues.reduce((sum, value) => sum + value, 0) : null,
      farmableCount: materialInsights.filter((insight) => insight.canFarm).length,
      buyableCount: materialInsights.filter((insight) => insight.hasMarketPrice).length,
      missingDataCount,
      readyToCalculate: marketSummary.total !== null,
      nextAction: getNextAction(marketSummary.missingCount, missingDataCount, server)
    };
  },

  getMaterialInsight(material: ImbuementInsightMaterialLike, unitMarketPrice: number | ""): ImbuementMaterialInsight {
    const hasMarketPrice = typeof unitMarketPrice === "number" && Number.isFinite(unitMarketPrice) && unitMarketPrice > 0;
    const canFarm = Number(material.droppedByCount ?? 0) > 0;

    if (material.dataStatus === "unmatched") {
      return {
        status: "missing-data",
        label: "Revisar item",
        description: "Material ainda nao foi encontrado na base local.",
        hasMarketPrice,
        canFarm
      };
    }

    if (hasMarketPrice && canFarm) {
      return {
        status: "balanced",
        label: "Comprar ou farmar",
        description: "Tem preco de Market e fontes de drop locais para comparar.",
        hasMarketPrice,
        canFarm
      };
    }

    if (hasMarketPrice) {
      return {
        status: "market-only",
        label: "Comprar no Market",
        description: "Tem preco informado, mas ainda nao temos fonte de drop local.",
        hasMarketPrice,
        canFarm
      };
    }

    if (canFarm) {
      return {
        status: "farm-only",
        label: "Farmar ou precificar",
        description: "Tem fonte de drop local, mas falta preco de Market.",
        hasMarketPrice,
        canFarm
      };
    }

    return {
      status: "needs-price",
      label: "Sem preco/drop",
      description: "Falta preco de Market e fonte de drop local.",
      hasMarketPrice,
      canFarm
    };
  },

  mergeSavedMaterialPrices(prices: ImbuementMarketPriceMap, imbuement: ImbuementRecord | null, server: VaultServer | null) {
    if (!imbuement || !server) return prices;

    let changed = false;
    const next = { ...prices };
    for (const material of imbuement.materials) {
      if (!material.itemId) continue;

      const key = ImbuementMarketService.getMaterialPriceKey(material);
      const current = next[key];
      if (Number.isFinite(current) && current > 0) continue;

      const suggestion = ItemPriceMemoryService.getBestPrice(server, material.itemId, { includeNpc: false });
      if (!suggestion) continue;

      next[key] = suggestion.value;
      changed = true;
    }

    if (changed) {
      ImbuementMarketService.savePrices(server, next);
    }

    return changed ? next : prices;
  },

  getMaterialPriceSuggestions(imbuement: ImbuementRecord, server: VaultServer | null) {
    if (!server) return {};

    return imbuement.materials.reduce<Record<string, ItemPriceMemorySuggestion>>((acc, material) => {
      if (!material.itemId) return acc;

      const suggestion = ItemPriceMemoryService.getBestPrice(server, material.itemId, { includeNpc: false });
      if (!suggestion) return acc;

      acc[ImbuementMarketService.getMaterialPriceKey(material)] = suggestion;
      return acc;
    }, {});
  },

  getMaterialPriceSuggestion(material: ImbuementInsightMaterialLike, server: VaultServer | null): ItemPriceMemorySuggestion | null {
    if (!server || !material.itemId) return null;
    return ItemPriceMemoryService.getBestPrice(server, material.itemId, { includeNpc: false });
  },

  rememberImbuementMaterialPrices(imbuement: ImbuementRecord, prices: ImbuementMarketPriceMap, server: VaultServer, context: string) {
    for (const material of imbuement.materials) {
      const key = ImbuementMarketService.getMaterialPriceKey(material);
      const price = prices[key];
      if (Number.isFinite(price) && price > 0) {
        this.rememberMaterialPrice(material, price, server, context);
      }
    }
  },

  rememberMaterialPrice(material: ImbuementInsightMaterialLike, value: number, server: VaultServer | null, context: string) {
    if (!server || !material.itemId || !Number.isFinite(value) || value <= 0) return;

    ItemPriceMemoryService.rememberPrice({
      server,
      itemId: material.itemId,
      itemName: getMaterialName(material),
      source: "imbuement-market",
      value,
      context: `Imbuement Database - ${context}`
    });
  }
};

function getMaterialName(material: ImbuementInsightMaterialLike) {
  return material.resolvedName || material.itemName || material.Name || `Item ${material.itemId}`;
}

function getNextAction(missingMarketCount: number, missingDataCount: number, server: VaultServer | null) {
  if (!server) return "Configure uma cotacao ativa para converter em moeda premium e reais.";
  if (missingDataCount > 0) return `Revise ${missingDataCount} material(is) que ainda nao casaram com a base local.`;
  if (missingMarketCount > 0) return `Preencha ${missingMarketCount} preco(s) de Market para fechar o custo total.`;
  return "Custo fechado. Agora compare comprar no Market, farmar materiais ou salvar snapshot.";
}
