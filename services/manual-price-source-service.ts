import { StorageService } from "./storage-service";

const MANUAL_PRICE_SOURCES_KEY = "reinahub_manual_price_sources";

export type ManualPriceSourceKind = "official" | "reseller" | "manual";

export type ManualPriceSource = {
  id: string;
  serverId: string;
  label: string;
  kind: ManualPriceSourceKind;
  url?: string;
  loteVenda: number;
  loteCompra: number;
  note: string;
  updatedAt: number;
};

export type ManualPriceSourceInput = Omit<ManualPriceSource, "id" | "updatedAt">;

export class ManualPriceSourceService {
  static load() {
    return StorageService.get<ManualPriceSource[]>(MANUAL_PRICE_SOURCES_KEY, []);
  }

  static listByServer(serverId: string) {
    return this.load()
      .filter((source) => source.serverId === serverId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  static save(input: ManualPriceSourceInput, editingId?: string | null) {
    const current = this.load();
    const source: ManualPriceSource = {
      ...input,
      id: editingId ?? `price_${Date.now()}`,
      label: input.label.trim() || "Fonte manual",
      url: input.url?.trim() || "",
      loteVenda: Number(input.loteVenda) || 0,
      loteCompra: Number(input.loteCompra) || 0,
      note: input.note?.trim() || "",
      updatedAt: Date.now()
    };
    const next = editingId ? current.map((item) => (item.id === editingId ? source : item)) : [source, ...current];
    StorageService.set(MANUAL_PRICE_SOURCES_KEY, next);
    return next;
  }

  static remove(id: string) {
    const next = this.load().filter((source) => source.id !== id);
    StorageService.set(MANUAL_PRICE_SOURCES_KEY, next);
    return next;
  }
}
