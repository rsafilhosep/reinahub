"use client";

import { useEffect, useState } from "react";
import type { NpcHubRecord, NpcSearchResult } from "../types";

export function useNpcHub(initialNpcName?: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NpcSearchResult[]>([]);
  const [selectedNpc, setSelectedNpc] = useState<NpcHubRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialNpcName) return;
    void selectNpc(initialNpcName);
  }, [initialNpcName]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/npcs?query=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Nao foi possivel buscar NPCs.");
        const data = (await response.json()) as { results: NpcSearchResult[] };
        setResults(data.results);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Erro ao buscar NPCs.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query]);

  async function selectNpc(name: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/npcs?name=${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error("NPC nao encontrado.");
      const data = (await response.json()) as { npc: NpcHubRecord };
      setSelectedNpc(data.npc);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao carregar NPC.");
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    results,
    selectedNpc,
    selectNpc,
    loading,
    error
  };
}
