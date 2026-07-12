"use client";

import type { ItemDatabaseRecord, ItemSearchResult } from "../types";

export type ItemSearchClientOptions = {
  query: string;
  category?: string | null;
  signal?: AbortSignal;
};

export const ItemSearchClientService = {
  async searchItems({ query, category, signal }: ItemSearchClientOptions): Promise<ItemSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const params = new URLSearchParams({ query: trimmedQuery });
    if (category?.trim()) params.set("category", category.trim());

    const response = await fetch(`/api/items?${params.toString()}`, { signal });
    const data = (await response.json()) as { results?: ItemSearchResult[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Erro ao buscar itens.");
    return data.results ?? [];
  },

  async getItemById(itemId: number | string, signal?: AbortSignal): Promise<ItemDatabaseRecord> {
    const response = await fetch(`/api/items?id=${encodeURIComponent(itemId)}`, { signal });
    const data = (await response.json()) as { item?: ItemDatabaseRecord; error?: string };
    if (!response.ok || !data.item) throw new Error(data.error ?? "Item nao encontrado.");
    return data.item;
  },

  async getItemByName(name: string, signal?: AbortSignal): Promise<ItemDatabaseRecord> {
    const response = await fetch(`/api/items?name=${encodeURIComponent(name)}`, { signal });
    const data = (await response.json()) as { item?: ItemDatabaseRecord; error?: string };
    if (!response.ok || !data.item) throw new Error(data.error ?? "Item nao encontrado.");
    return data.item;
  }
};
