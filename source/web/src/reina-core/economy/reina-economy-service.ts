"use client";

import {
  getActiveServer,
  getServerDisplayName,
  getServerPlatformName,
  getServerWorldName,
  goldToPremium,
  loadServers,
  premiumToBrl,
  setActiveServerId
} from "@/services/quote-service";
import type { VaultServer } from "@/types/vault";
import { ProfileService, type ReinaProfile } from "@/source/web/src/reina-core/profiles/profile-service";

export type EconomySide = "venda" | "compra";

export type ReinaEconomyContext = {
  profile: ReinaProfile | null;
  server: VaultServer | null;
  serverId: string | null;
  profileName: string;
  serverName: string;
  platformName: string;
  worldName: string;
  currencyName: string;
  lotSize: number;
  goldPerPremium: number;
  sellLotPrice: number;
  buyLotPrice: number;
  sellUnitPrice: number;
  buyUnitPrice: number;
};

export const ReinaEconomyService = {
  getActiveContext(): ReinaEconomyContext {
    const profile = ProfileService.getActiveProfile();
    const server = ProfileService.getProfileServer(profile);
    return buildContext(profile, server);
  },

  getServerContext(server: VaultServer | null, profile: ReinaProfile | null = null): ReinaEconomyContext {
    return buildContext(profile, server);
  },

  getServerById(serverId: string | null | undefined) {
    if (!serverId) return null;
    return loadServers().find((server) => server.id === serverId) ?? null;
  },

  setActiveServer(serverId: string) {
    setActiveServerId(serverId);
    ProfileService.setActiveProfileServer(serverId);
    window.dispatchEvent(new Event("reinahub:economy-change"));
  },

  goldToPremium(server: VaultServer | null, gold: number) {
    return server ? goldToPremium(server, safeNumber(gold)) : 0;
  },

  premiumToGold(server: VaultServer | null, premium: number) {
    return server ? safeNumber(premium) * safeNumber(server.gcPorMoeda) : 0;
  },

  premiumToBrl(server: VaultServer | null, premium: number, side: EconomySide = "venda") {
    return server ? premiumToBrl(server, safeNumber(premium), side) : 0;
  },

  goldToBrl(server: VaultServer | null, gold: number, side: EconomySide = "venda") {
    const premium = this.goldToPremium(server, gold);
    return this.premiumToBrl(server, premium, side);
  },

  brlToPremium(server: VaultServer | null, brl: number, side: EconomySide = "compra") {
    if (!server) return 0;
    const lotPrice = side === "venda" ? server.loteVenda : server.loteCompra;
    const unitPrice = safeNumber(server.lote) > 0 ? safeNumber(lotPrice) / safeNumber(server.lote) : 0;
    return unitPrice > 0 ? safeNumber(brl) / unitPrice : 0;
  },

  brlToGold(server: VaultServer | null, brl: number, side: EconomySide = "compra") {
    return this.premiumToGold(server, this.brlToPremium(server, brl, side));
  },

  getDisplayName(server: VaultServer | null) {
    return server ? getServerDisplayName(server) : "Servidor nao definido";
  },

  getPlatformName(server: VaultServer | null) {
    return server ? getServerPlatformName(server) : "";
  },

  getWorldName(server: VaultServer | null) {
    return server ? getServerWorldName(server) : "";
  },

  subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener("reinahub:quote-change", callback);
    window.addEventListener("reinahub:profile-change", callback);
    window.addEventListener("reinahub:economy-change", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("reinahub:quote-change", callback);
      window.removeEventListener("reinahub:profile-change", callback);
      window.removeEventListener("reinahub:economy-change", callback);
    };
  },

  notifyChanged() {
    window.dispatchEvent(new Event("reinahub:economy-change"));
  }
};

function buildContext(profile: ReinaProfile | null, server: VaultServer | null): ReinaEconomyContext {
  const lotSize = safeNumber(server?.lote);
  const sellLotPrice = safeNumber(server?.loteVenda);
  const buyLotPrice = safeNumber(server?.loteCompra);

  return {
    profile,
    server,
    serverId: server?.id ?? null,
    profileName: profile?.name ?? "Perfil nao definido",
    serverName: ReinaEconomyService.getDisplayName(server),
    platformName: ReinaEconomyService.getPlatformName(server),
    worldName: ReinaEconomyService.getWorldName(server),
    currencyName: server?.moeda || "moeda premium",
    lotSize,
    goldPerPremium: safeNumber(server?.gcPorMoeda),
    sellLotPrice,
    buyLotPrice,
    sellUnitPrice: lotSize > 0 ? sellLotPrice / lotSize : 0,
    buyUnitPrice: lotSize > 0 ? buyLotPrice / lotSize : 0
  };
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}
