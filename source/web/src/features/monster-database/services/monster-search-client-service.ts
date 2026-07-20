"use client";

import type { MonsterDatabaseRecord, MonsterSearchResult } from "../types";

export type MonsterSearchClientOptions = {
  query: string;
  signal?: AbortSignal;
};

export const MonsterSearchClientService = {
  async searchMonsters({ query, signal }: MonsterSearchClientOptions): Promise<MonsterSearchResult[]> {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return [];

    const params = new URLSearchParams({ query: trimmedQuery });
    const response = await fetch(`/api/monsters?${params.toString()}`, { signal });
    const data = (await response.json()) as { results?: MonsterSearchResult[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Erro ao buscar monstros.");
    return data.results ?? [];
  },

  async getMonster(name: string, signal?: AbortSignal): Promise<MonsterDatabaseRecord> {
    const response = await fetch(`/api/monsters?monster=${encodeURIComponent(name)}`, { signal });
    const data = (await response.json()) as { monster?: MonsterDatabaseRecord; error?: string };
    if (!response.ok || !data.monster) throw new Error(data.error ?? "Monstro nao encontrado.");
    return data.monster;
  }
};
