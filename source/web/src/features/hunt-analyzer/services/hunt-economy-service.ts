"use client";

import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { ImbuementMarketService, type ImbuementMarketPriceMap } from "@/source/web/src/features/imbuement-database/services/imbuement-market-service";
import type { HuntSummary } from "@/services/hunt-service";
import type { VaultServer } from "@/types/vault";

export type HuntEconomySummary = {
  balancePremium: number;
  balanceBrl: number;
  imbuementMarket: {
    pricedTypes: number;
    totalMarketValue: number;
    premium: number;
    brl: number;
  };
};

export const HuntEconomyService = {
  summarize(summary: HuntSummary | null, server: VaultServer | null, imbuementPrices: ImbuementMarketPriceMap): HuntEconomySummary {
    const balancePremium = summary ? ReinaEconomyService.goldToPremium(server, summary.balance) : 0;
    const balanceBrl = ReinaEconomyService.premiumToBrl(server, balancePremium, "venda");
    const imbuementMarket = ImbuementMarketService.summarizeHuntItems(summary?.imbuementLootItems ?? [], imbuementPrices);
    const imbuementPremium = ReinaEconomyService.goldToPremium(server, imbuementMarket.totalMarketValue);

    return {
      balancePremium,
      balanceBrl,
      imbuementMarket: {
        ...imbuementMarket,
        premium: imbuementPremium,
        brl: ReinaEconomyService.premiumToBrl(server, imbuementPremium, "venda")
      }
    };
  }
};
