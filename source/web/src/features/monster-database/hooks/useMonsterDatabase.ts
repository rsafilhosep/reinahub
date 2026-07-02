"use client";

import { useEffect, useState } from "react";
import type { MonsterDatabaseRecord, MonsterSearchResult } from "../types";

export function useMonsterDatabase(initialMonsterName?: string) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MonsterSearchResult[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialMonsterName) return;
    void selectMonster(initialMonsterName);
  }, [initialMonsterName]);

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
        const response = await fetch(`/api/monsters?query=${encodeURIComponent(trimmedQuery)}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Nao foi possivel buscar monstros.");
        const data = (await response.json()) as { results: MonsterSearchResult[] };
        setResults(data.results);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Erro ao buscar monstros.");
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

  async function selectMonster(name: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/monsters?name=${encodeURIComponent(name)}`);
      if (!response.ok) throw new Error("Monstro nao encontrado.");
      const data = (await response.json()) as { monster: MonsterDatabaseRecord };
      setSelectedMonster(data.monster);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao carregar monstro.");
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    results,
    selectedMonster,
    selectMonster,
    loading,
    error
  };
}
