"use client";

import { useEffect, useState } from "react";
import type { ImbuementRecord, ImbuementSearchResult } from "../types";

export function useImbuementDatabase(initialImbuementId?: string) {
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState("");
  const [results, setResults] = useState<ImbuementSearchResult[]>([]);
  const [selectedImbuement, setSelectedImbuement] = useState<ImbuementRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.set("query", query.trim());
        if (tier) params.set("tier", tier);
        const response = await fetch(`/api/imbuements?${params.toString()}`);
        const data = (await response.json()) as { results?: ImbuementSearchResult[]; error?: string };
        if (!response.ok) throw new Error(data.error ?? "Erro ao buscar imbuements.");
        if (!cancelled) setResults(data.results ?? []);
      } catch (err) {
        if (!cancelled) {
          setResults([]);
          setError(err instanceof Error ? err.message : "Erro ao buscar imbuements.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [query, tier]);

  useEffect(() => {
    if (!initialImbuementId) return;
    selectImbuement(initialImbuementId);
  }, [initialImbuementId]);

  async function selectImbuement(id: string) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/imbuements?id=${encodeURIComponent(id)}`);
      const data = (await response.json()) as { imbuement?: ImbuementRecord; error?: string };
      if (!response.ok || !data.imbuement) throw new Error(data.error ?? "Imbuement nao encontrado.");
      setSelectedImbuement(data.imbuement);
    } catch (err) {
      setSelectedImbuement(null);
      setError(err instanceof Error ? err.message : "Erro ao abrir imbuement.");
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    tier,
    setTier,
    results,
    selectedImbuement,
    selectImbuement,
    loading,
    error
  };
}
