"use client";

import { StorageService } from "@/services/storage-service";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import type { ImbuementRecord } from "../types";

const MARKET_PRICES_KEY = "imbuement_market_prices";
const MARKET_PRICES_BY_SERVER_PREFIX = "imbuement_market_prices:";
const MARKET_SNAPSHOTS_KEY = "imbuement_market_snapshots";

export type ImbuementMarketPriceMap = Record<string, number>;

export type ImbuementMarketSnapshot = {
  id: string;
  imbuementId: string;
  imbuementName: string;
  serverId: string;
  serverName: string;
  totalMarketCost: number;
  premiumAmount: number;
  brlAmount: number;
  materialPrices: ImbuementMarketPriceMap;
  createdAt: number;
};

export type ImbuementMarketSummary = {
  pricedCount: number;
  total: number | null;
  missingCount: number;
  premium: number;
  brl: number;
};

export type HuntImbuementMarketSummary = {
  pricedTypes: number;
  totalMarketValue: number;
};

type ImbuementLikeMaterial = {
  itemId?: number | null;
  resolvedName?: string;
  itemName?: string;
  Name?: string;
  Count?: number;
  count?: number;
};

export const ImbuementMarketService = {
  loadPrices(server: VaultServer | null): ImbuementMarketPriceMap {
    const scoped = StorageService.get<ImbuementMarketPriceMap>(getMarketPricesStorageKey(server), {});
    if (Object.keys(scoped).length > 0) return scoped;
    return StorageService.get<ImbuementMarketPriceMap>(MARKET_PRICES_KEY, {});
  },

  savePrices(server: VaultServer | null, prices: ImbuementMarketPriceMap) {
    StorageService.set(getMarketPricesStorageKey(server), prices);
  },

  getMaterialPriceKey(material: ImbuementLikeMaterial) {
    return material.itemId ? `item:${material.itemId}` : `name:${material.resolvedName || material.itemName || material.Name || ""}`;
  },

  summarizeImbuement(imbuement: ImbuementRecord | null, prices: ImbuementMarketPriceMap, server: VaultServer | null): ImbuementMarketSummary {
    if (!imbuement) {
      return { pricedCount: 0, total: null, missingCount: 0, premium: 0, brl: 0 };
    }

    const values = imbuement.materials.map((material) => {
      const unitPrice = prices[this.getMaterialPriceKey(material)];
      return Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice * material.count : null;
    });
    const pricedValues = values.filter((value): value is number => value !== null);
    const total = pricedValues.length === imbuement.materials.length ? pricedValues.reduce((sum, value) => sum + value, 0) : null;
    const premium = total !== null ? ReinaEconomyService.goldToPremium(server, total) : 0;

    return {
      pricedCount: pricedValues.length,
      total,
      missingCount: imbuement.materials.length - pricedValues.length,
      premium,
      brl: ReinaEconomyService.premiumToBrl(server, premium, "venda")
    };
  },

  summarizeHuntItems(items: ImbuementLikeMaterial[], prices: ImbuementMarketPriceMap): HuntImbuementMarketSummary {
    return items.reduce(
      (acc, item) => {
        const unitPrice = prices[this.getMaterialPriceKey(item)];
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) return acc;
        return {
          pricedTypes: acc.pricedTypes + 1,
          totalMarketValue: acc.totalMarketValue + unitPrice * (Number(item.Count ?? item.count) || 0)
        };
      },
      { pricedTypes: 0, totalMarketValue: 0 }
    );
  },

  loadSnapshots() {
    return StorageService.get<ImbuementMarketSnapshot[]>(MARKET_SNAPSHOTS_KEY, []);
  },

  saveSnapshots(snapshots: ImbuementMarketSnapshot[]) {
    StorageService.set(MARKET_SNAPSHOTS_KEY, snapshots);
  },

  createSnapshot({
    imbuement,
    server,
    prices,
    summary,
    existingSnapshots
  }: {
    imbuement: ImbuementRecord;
    server: VaultServer;
    prices: ImbuementMarketPriceMap;
    summary: ImbuementMarketSummary;
    existingSnapshots: ImbuementMarketSnapshot[];
  }) {
    if (summary.total === null) return existingSnapshots;

    const materialPrices = imbuement.materials.reduce<ImbuementMarketPriceMap>((acc, material) => {
      const key = this.getMaterialPriceKey(material);
      const price = prices[key];
      if (Number.isFinite(price) && price > 0) acc[key] = price;
      return acc;
    }, {});

    const next = [
      {
        id: `${imbuement.id}-${server.id}-${Date.now()}`,
        imbuementId: imbuement.id,
        imbuementName: imbuement.name,
        serverId: server.id,
        serverName: ReinaEconomyService.getDisplayName(server),
        totalMarketCost: summary.total,
        premiumAmount: summary.premium,
        brlAmount: summary.brl,
        materialPrices,
        createdAt: Date.now()
      },
      ...existingSnapshots
    ].slice(0, 80);

    this.saveSnapshots(next);
    return next;
  },

  clearSnapshotsForImbuement(snapshots: ImbuementMarketSnapshot[], imbuementId: string, serverId: string) {
    const next = snapshots.filter((snapshot) => snapshot.imbuementId !== imbuementId || snapshot.serverId !== serverId);
    this.saveSnapshots(next);
    return next;
  }
};

function getMarketPricesStorageKey(server: VaultServer | null) {
  return server?.id ? `${MARKET_PRICES_BY_SERVER_PREFIX}${server.id}` : MARKET_PRICES_KEY;
}
