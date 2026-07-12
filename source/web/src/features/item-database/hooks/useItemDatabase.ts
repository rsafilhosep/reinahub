"use client";

import { useEffect, useState } from "react";
import { ItemSearchClientService } from "../services/item-search-client-service";
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
        const items = await ItemSearchClientService.searchItems({ query: trimmedQuery, category, signal: controller.signal });
        setResults(items);
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
      setSelectedItem(await ItemSearchClientService.getItemById(itemId));
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
