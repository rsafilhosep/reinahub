import type { QuoteSnapshot, VaultServer } from "@/types/vault";
import { StorageService } from "./storage-service";

export const SERVERS_KEY = "vot_servers";
export const ACTIVE_SERVER_KEY = "vot_active_server";
export const QUOTE_HISTORY_KEY = "vot_quote_history";

export const defaultServer: VaultServer = {
  id: "srv_global",
  nome: "Yubra",
  plataforma: "Tibia Global",
  mundo: "Yubra",
  tipo: "global",
  moeda: "Tibia Coin",
  lote: 25,
  gcPorMoeda: 80000,
  loteVenda: 2.33,
  loteCompra: 1.75
};

export function loadServers() {
  const servers = StorageService.get<VaultServer[]>(SERVERS_KEY, []);
  if (servers.length) return servers.map(normalizeServer);
  StorageService.set(SERVERS_KEY, [defaultServer]);
  StorageService.setString(ACTIVE_SERVER_KEY, defaultServer.id);
  return [defaultServer];
}

export function saveServers(servers: VaultServer[]) {
  StorageService.set(SERVERS_KEY, servers.map(normalizeServer));
}

export function getActiveServerId() {
  return StorageService.getString(ACTIVE_SERVER_KEY, "");
}

export function setActiveServerId(id: string) {
  StorageService.setString(ACTIVE_SERVER_KEY, id);
  window.dispatchEvent(new Event("reinahub:quote-change"));
}

export function getActiveServer() {
  const servers = loadServers();
  return servers.find((server) => server.id === getActiveServerId()) ?? servers[0] ?? null;
}

export function saveQuoteSnapshot(server: VaultServer) {
  const history = StorageService.get<QuoteSnapshot[]>(QUOTE_HISTORY_KEY, []);
  const next = [
    ...history,
    {
      ts: Date.now(),
      nome: server.nome,
      moeda: server.moeda,
      gcPorMoeda: server.gcPorMoeda,
      unitVenda: server.loteVenda / server.lote,
      unitCompra: server.loteCompra / server.lote
    }
  ].slice(-100);
  StorageService.set(QUOTE_HISTORY_KEY, next);
  return next;
}

export function premiumToBrl(server: VaultServer, premium: number, side: "venda" | "compra" = "venda") {
  const unit = side === "venda" ? server.loteVenda / server.lote : server.loteCompra / server.lote;
  return premium * unit;
}

export function goldToPremium(server: VaultServer, gold: number) {
  return server.gcPorMoeda > 0 ? gold / server.gcPorMoeda : 0;
}

export function getServerPlatformName(server: VaultServer) {
  return server.plataforma?.trim() || (server.tipo === "global" ? "Tibia Global" : "OTServer");
}

export function getServerWorldName(server: VaultServer) {
  return server.mundo?.trim() || server.nome;
}

export function getServerDisplayName(server: VaultServer) {
  const platform = getServerPlatformName(server);
  const world = getServerWorldName(server);
  return platform && platform !== world ? `${platform} - ${world}` : world;
}

function normalizeServer(server: VaultServer): VaultServer {
  const plataforma = server.plataforma?.trim() || (server.tipo === "global" ? "Tibia Global" : "OTServer");
  const mundo = server.mundo?.trim() || server.nome;
  return {
    ...server,
    plataforma,
    mundo,
    nome: mundo,
    lote: Number(server.lote) || 25,
    gcPorMoeda: Number(server.gcPorMoeda) || 0,
    loteVenda: Number(server.loteVenda) || 0,
    loteCompra: Number(server.loteCompra) || 0
  };
}
