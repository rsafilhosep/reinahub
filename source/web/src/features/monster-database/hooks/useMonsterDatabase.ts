"use client";

import { useEffect, useState } from "react";
import type { MonsterClassSummary, MonsterDatabaseRecord, MonsterSearchResult } from "../types";

export function useMonsterDatabase(initialMonsterName?: string) {
  const [query, setQuery] = useState("");
  const [creatureClass, setCreatureClass] = useState("");
  const [classes, setClasses] = useState<MonsterClassSummary[]>([]);
  const [results, setResults] = useState<MonsterSearchResult[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<MonsterDatabaseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadClasses() {
      try {
        const response = await fetch("/api/monsters?classes=1", { signal: controller.signal });
        if (!response.ok) throw new Error("Nao foi possivel carregar classes.");
        const data = (await response.json()) as { classes: MonsterClassSummary[] };
        setClasses(data.classes);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Erro ao carregar classes.");
        }
      }
    }

    void loadClasses();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!initialMonsterName) return;
    void selectMonster(initialMonsterName);
  }, [initialMonsterName]);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery && !creatureClass) {
      setResults([]);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (trimmedQuery) params.set("query", trimmedQuery);
        if (creatureClass) params.set("class", creatureClass);
        const response = await fetch(`/api/monsters?${params.toString()}`, {
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
  }, [query, creatureClass]);

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
    creatureClass,
    setCreatureClass,
    classes,
    results,
    selectedMonster,
    selectMonster,
    loading,
    error
  };
}
