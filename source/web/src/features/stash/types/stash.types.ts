import type { ItemSearchResult } from "../../item-database/types";

export type StashItem = {
  id: string;
  itemId: number;
  name: string;
  imagePath: string;
  category: string;
  quantity: number;
  unitGoldPrice: number;
  priceSource: "npc" | "manual";
  createdAt: number;
  updatedAt: number;
};

export type StashDraft = {
  item: ItemSearchResult;
  quantity: number;
  unitGoldPrice: number;
  priceSource: "npc" | "manual";
};

export type StashTotals = {
  totalItems: number;
  totalQuantity: number;
  totalGold: number;
  totalPremium: number;
  totalBrlVenda: number;
  totalBrlCompra: number;
};

export type StashComparison = {
  base: StashTotals;
  compare: StashTotals;
  diffPremium: number;
  diffBrlVenda: number;
  diffBrlCompra: number;
  premiumRatio: number;
  brlVendaRatio: number;
};

export type StashSortKey =
  | "name"
  | "quantity"
  | "unitGoldPrice"
  | "totalGold"
  | "unitPremium"
  | "totalPremium"
  | "unitBrl"
  | "totalBrl";

export type StashSortDirection = "asc" | "desc";
