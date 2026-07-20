"use client";

import type { EquipmentComparison, EquipmentRecord, EquipmentSearchResult } from "../types";

export type EquipmentSearchClientOptions = {
  query?: string;
  category?: string | null;
  weaponType?: string | null;
  hands?: number | null;
  level?: number | null;
  includeAboveLevel?: boolean;
  vocation?: string | null;
  minSlots?: number | null;
  maxWeightOz?: number | null;
  signal?: AbortSignal;
};

export const EquipmentSearchClientService = {
  async searchEquipment(options: EquipmentSearchClientOptions): Promise<EquipmentSearchResult[]> {
    const params = new URLSearchParams();
    if (options.query?.trim()) params.set("query", options.query.trim());
    if (options.category?.trim()) params.set("category", options.category.trim());
    if (options.weaponType?.trim()) params.set("weaponType", options.weaponType.trim());
    if (typeof options.hands === "number" && Number.isFinite(options.hands)) params.set("hands", String(options.hands));
    if (typeof options.level === "number" && Number.isFinite(options.level)) params.set("level", String(options.level));
    if (options.includeAboveLevel === false) params.set("includeAboveLevel", "false");
    if (options.vocation?.trim()) params.set("vocation", options.vocation.trim());
    if (typeof options.minSlots === "number" && Number.isFinite(options.minSlots)) params.set("minSlots", String(options.minSlots));
    if (typeof options.maxWeightOz === "number" && Number.isFinite(options.maxWeightOz)) params.set("maxWeightOz", String(options.maxWeightOz));

    const response = await fetch(`/api/equipment?${params.toString()}`, { signal: options.signal });
    const data = (await response.json()) as { results?: EquipmentSearchResult[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Erro ao buscar equipamentos.");
    return data.results ?? [];
  },

  async getEquipment(id: string, signal?: AbortSignal): Promise<EquipmentRecord> {
    const response = await fetch(`/api/equipment?id=${encodeURIComponent(id)}`, { signal });
    const data = (await response.json()) as { equipment?: EquipmentRecord; error?: string };
    if (!response.ok || !data.equipment) throw new Error(data.error ?? "Equipamento nao encontrado.");
    return data.equipment;
  },

  async compareEquipment(leftId: string, rightId: string, signal?: AbortSignal): Promise<EquipmentComparison> {
    const params = new URLSearchParams({ left: leftId, right: rightId });
    const response = await fetch(`/api/equipment?${params.toString()}`, { signal });
    const data = (await response.json()) as { comparison?: EquipmentComparison; error?: string };
    if (!response.ok || !data.comparison) throw new Error(data.error ?? "Comparacao nao encontrada.");
    return data.comparison;
  }
};
