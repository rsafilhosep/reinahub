"use client";

import { StorageService } from "@/services/storage-service";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import { ProfileService } from "@/source/web/src/reina-core/profiles/profile-service";
import type { StashComparison, StashDraft, StashItem, StashTotals } from "../types";

const STASH_ITEMS_KEY = "reinahub_stash_items";
const PROFILE_STASH_ITEMS_PREFIX = "reinahub_stash_items_profile_";

export const StashService = {
  loadItems() {
    return StorageService.get<StashItem[]>(getProfileStashKey(), migrateLegacyItems());
  },

  saveItems(items: StashItem[]) {
    StorageService.set(getProfileStashKey(), items);
  },

  clearItems() {
    StorageService.remove(getProfileStashKey());
  },

  upsertItem(items: StashItem[], draft: StashDraft) {
    const now = Date.now();
    const existing = items.find((item) => item.itemId === draft.item.id);
    const quantity = normalizeNumber(draft.quantity);
    const unitGoldPrice = normalizeNumber(draft.unitGoldPrice);

    if (existing) {
      return items.map((item) =>
        item.itemId === draft.item.id
          ? {
              ...item,
              name: draft.item.name,
              imagePath: draft.item.image.path,
              category: draft.item.category,
              quantity,
              unitGoldPrice,
              priceSource: draft.priceSource,
              updatedAt: now
            }
          : item
      );
    }

    return [
      ...items,
      {
        id: `${draft.item.id}-${now}`,
        itemId: draft.item.id,
        name: draft.item.name,
        imagePath: draft.item.image.path,
        category: draft.item.category,
        quantity,
        unitGoldPrice,
        priceSource: draft.priceSource,
        createdAt: now,
        updatedAt: now
      }
    ];
  },

  removeItem(items: StashItem[], itemId: number) {
    return items.filter((item) => item.itemId !== itemId);
  },

  updateItem(items: StashItem[], itemId: number, patch: Partial<Pick<StashItem, "quantity" | "unitGoldPrice" | "priceSource">>) {
    const now = Date.now();
    return items.map((item) =>
      item.itemId === itemId
        ? {
            ...item,
            ...(patch.quantity !== undefined ? { quantity: normalizeNumber(patch.quantity) } : {}),
            ...(patch.unitGoldPrice !== undefined ? { unitGoldPrice: normalizeNumber(patch.unitGoldPrice) } : {}),
            ...(patch.priceSource ? { priceSource: patch.priceSource } : {}),
            updatedAt: now
          }
        : item
    );
  },

  adjustQuantity(items: StashItem[], itemId: number, delta: number) {
    const item = items.find((stashItem) => stashItem.itemId === itemId);
    if (!item) return items;
    return this.updateItem(items, itemId, { quantity: Math.max(0, normalizeNumber(item.quantity) + delta) });
  },

  calculateItem(item: StashItem, server: VaultServer | null) {
    const quantity = normalizeNumber(item.quantity);
    const unitGold = normalizeNumber(item.unitGoldPrice);
    const totalGold = quantity * unitGold;
    const unitPremium = ReinaEconomyService.goldToPremium(server, unitGold);
    const totalPremium = ReinaEconomyService.goldToPremium(server, totalGold);
    const unitBrlVenda = ReinaEconomyService.premiumToBrl(server, unitPremium, "venda");
    const totalBrlVenda = ReinaEconomyService.premiumToBrl(server, totalPremium, "venda");
    const unitBrlCompra = ReinaEconomyService.premiumToBrl(server, unitPremium, "compra");
    const totalBrlCompra = ReinaEconomyService.premiumToBrl(server, totalPremium, "compra");

    return {
      quantity,
      unitGold,
      totalGold,
      unitPremium,
      totalPremium,
      unitBrlVenda,
      totalBrlVenda,
      unitBrlCompra,
      totalBrlCompra
    };
  },

  summarize(items: StashItem[], server: VaultServer | null): StashTotals {
    return items.reduce<StashTotals>(
      (totals, item) => {
        const calculated = this.calculateItem(item, server);
        totals.totalItems += 1;
        totals.totalQuantity += calculated.quantity;
        totals.totalGold += calculated.totalGold;
        totals.totalPremium += calculated.totalPremium;
        totals.totalBrlVenda += calculated.totalBrlVenda;
        totals.totalBrlCompra += calculated.totalBrlCompra;
        return totals;
      },
      {
        totalItems: 0,
        totalQuantity: 0,
        totalGold: 0,
        totalPremium: 0,
        totalBrlVenda: 0,
        totalBrlCompra: 0
      }
    );
  },

  compareQuotes(items: StashItem[], baseServer: VaultServer | null, compareServer: VaultServer | null): StashComparison {
    const base = this.summarize(items, baseServer);
    const compare = this.summarize(items, compareServer);

    return {
      base,
      compare,
      diffPremium: compare.totalPremium - base.totalPremium,
      diffBrlVenda: compare.totalBrlVenda - base.totalBrlVenda,
      diffBrlCompra: compare.totalBrlCompra - base.totalBrlCompra,
      premiumRatio: base.totalPremium > 0 ? compare.totalPremium / base.totalPremium : 0,
      brlVendaRatio: base.totalBrlVenda > 0 ? compare.totalBrlVenda / base.totalBrlVenda : 0
    };
  }
};

function normalizeNumber(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function getProfileStashKey() {
  const profile = ProfileService.getActiveProfile();
  return `${PROFILE_STASH_ITEMS_PREFIX}${profile.id}`;
}

function migrateLegacyItems() {
  const legacy = StorageService.get<StashItem[]>(STASH_ITEMS_KEY, []);
  if (!legacy.length) return [];
  const profileKey = getProfileStashKey();
  const existing = StorageService.get<StashItem[]>(profileKey, []);
  if (!existing.length) {
    StorageService.set(profileKey, legacy);
  }
  return StorageService.get<StashItem[]>(profileKey, legacy);
}
