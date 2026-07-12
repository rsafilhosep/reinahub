import { StorageService } from "@/services/storage-service";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import { PREMIUM_PRODUCTS } from "../data/premium-products";
import type { PremiumGoalCalculation, PremiumGoalProgress, PremiumProductOverride } from "../types/premium-goals.types";

const PREMIUM_PRODUCT_OVERRIDES_KEY = "reinahub_premium_product_overrides";
const PREMIUM_GOAL_PROGRESS_KEY = "reinahub_premium_goal_progress";

export class PremiumGoalsService {
  static listProducts() {
    return PREMIUM_PRODUCTS;
  }

  static getProduct(productId: string) {
    return PREMIUM_PRODUCTS.find((product) => product.id === productId) ?? PREMIUM_PRODUCTS[0] ?? null;
  }

  static loadOverrides() {
    return StorageService.get<PremiumProductOverride[]>(PREMIUM_PRODUCT_OVERRIDES_KEY, []);
  }

  static getOverride(productId: string, serverId: string) {
    return this.loadOverrides().find((override) => override.productId === productId && override.serverId === serverId) ?? null;
  }

  static saveOverride(productId: string, serverId: string, cost: number) {
    const overrides = this.loadOverrides();
    const nextOverride: PremiumProductOverride = {
      productId,
      serverId,
      cost: Number(cost) || 0,
      updatedAt: Date.now()
    };
    const exists = overrides.some((override) => override.productId === productId && override.serverId === serverId);
    const next = exists
      ? overrides.map((override) => (override.productId === productId && override.serverId === serverId ? nextOverride : override))
      : [nextOverride, ...overrides];
    StorageService.set(PREMIUM_PRODUCT_OVERRIDES_KEY, next);
    return nextOverride;
  }

  static removeOverride(productId: string, serverId: string) {
    const next = this.loadOverrides().filter((override) => !(override.productId === productId && override.serverId === serverId));
    StorageService.set(PREMIUM_PRODUCT_OVERRIDES_KEY, next);
  }

  static loadProgress() {
    return StorageService.get<PremiumGoalProgress[]>(PREMIUM_GOAL_PROGRESS_KEY, []).map(normalizeProgress);
  }

  static getProgress(productId: string) {
    const context = ReinaActiveContextService.getActiveContext();
    return this.loadProgress().find((progress) => progress.productId === productId && matchesContext(progress, context)) ?? null;
  }

  static saveProgress(productId: string, ownedPremium: number) {
    const context = ReinaActiveContextService.getActiveContext();
    const progress: PremiumGoalProgress = {
      productId,
      profileId: context.profileId,
      profileName: context.profile?.name ?? null,
      characterId: context.characterId,
      characterName: context.character?.name ?? null,
      serverId: context.serverId,
      ownedPremium: Math.max(0, Number(ownedPremium) || 0),
      updatedAt: Date.now()
    };
    const current = this.loadProgress();
    const next = [
      progress,
      ...current.filter((row) => !(row.productId === productId && matchesContext(row, context)))
    ];
    StorageService.set(PREMIUM_GOAL_PROGRESS_KEY, next);
    return progress;
  }

  static calculate(productId: string, server: VaultServer | null, ownedPremium: number): PremiumGoalCalculation | null {
    const product = this.getProduct(productId);
    if (!product || !server) return null;

    const override = this.getOverride(product.id, server.id);
    const cost = override?.cost ?? product.defaultCost;
    const missingPremium = Math.max(0, cost - (Number(ownedPremium) || 0));
    const missingGold = missingPremium * server.gcPorMoeda;

    return {
      product,
      cost,
      currencyName: server.moeda,
      ownedPremium: Number(ownedPremium) || 0,
      missingPremium,
      missingGold,
      missingBrlVenda: ReinaEconomyService.premiumToBrl(server, missingPremium, "venda"),
      missingBrlCompra: ReinaEconomyService.premiumToBrl(server, missingPremium, "compra")
    };
  }

  static goldProgress(server: VaultServer | null, productId: string, ownedGold: number) {
    const product = this.getProduct(productId);
    if (!product || !server) return 0;
    return ReinaEconomyService.goldToPremium(server, Number(ownedGold) || 0);
  }
}

function normalizeProgress(progress: PremiumGoalProgress): PremiumGoalProgress {
  return {
    ...progress,
    profileId: progress.profileId ?? null,
    profileName: progress.profileName ?? null,
    characterId: progress.characterId ?? null,
    characterName: progress.characterName ?? null,
    serverId: progress.serverId ?? null,
    ownedPremium: Math.max(0, Number(progress.ownedPremium) || 0),
    updatedAt: Number(progress.updatedAt) || Date.now()
  };
}

function matchesContext(progress: PremiumGoalProgress, context: ReturnType<typeof ReinaActiveContextService.getActiveContext>) {
  if (progress.profileId) return progress.profileId === context.profileId;
  if (progress.characterId) return progress.characterId === context.characterId;
  if (progress.serverId) return progress.serverId === context.serverId;
  return true;
}
