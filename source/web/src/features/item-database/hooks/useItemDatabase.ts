"use client";

import { useEffect, useState } from "react";
import type { ItemDatabaseRecord, ItemSearchResult } from "../types";

export function useItemDatabase(initialItemId?: string) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemDatabaseRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialItemId) return;
    const numericItemId = Number(initialItemId);
    if (!Number.isFinite(numericItemId)) return;
    void selectItem(numericItemId);
  }, [initialItemId]);

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
        const params = new URLSearchParams({ query: trimmedQuery });
        if (category) params.set("category", category);
        const response = await fetch(`/api/items?${params.toString()}`, {
          signal: controller.signal
        });
        if (!response.ok) throw new Error("Nao foi possivel buscar itens.");
        const data = (await response.json()) as { results: ItemSearchResult[] };
        setResults(data.results);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Erro ao buscar itens.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, category]);

  async function selectItem(itemId: number) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/items?id=${encodeURIComponent(itemId)}`);
      if (!response.ok) throw new Error("Item nao encontrado.");
      const data = (await response.json()) as { item: ItemDatabaseRecord };
      setSelectedItem(data.item);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao carregar item.");
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    category,
    setCategory,
    results,
    selectedItem,
    selectItem,
    loading,
    error
  };
}
