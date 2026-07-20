"use client";

import { useEffect, useState } from "react";
import { ReinaActiveContextService, type ReinaActiveContext } from "@/source/web/src/reina-core/active-context/reina-active-context-service";
import { EquipmentSearchClientService } from "../services/equipment-search-client-service";
import type { EquipmentComparison, EquipmentRecord, EquipmentSearchResult } from "../types";

export function useEquipmentDatabase(initialEquipmentId?: string) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [weaponType, setWeaponType] = useState("");
  const [hands, setHands] = useState("");
  const [level, setLevel] = useState("");
  const [includeAboveLevel, setIncludeAboveLevel] = useState(true);
  const [vocation, setVocation] = useState("");
  const [minSlots, setMinSlots] = useState("");
  const [maxWeightOz, setMaxWeightOz] = useState("");
  const [results, setResults] = useState<EquipmentSearchResult[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentRecord | null>(null);
  const [compareLeftId, setCompareLeftId] = useState("");
  const [compareRightId, setCompareRightId] = useState("");
  const [comparison, setComparison] = useState<EquipmentComparison | null>(null);
  const [activeContext, setActiveContext] = useState<ReinaActiveContext | null>(null);
  const [hasAppliedCharacterContext, setHasAppliedCharacterContext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function refreshContext() {
      setActiveContext(ReinaActiveContextService.getActiveContext());
      setHasAppliedCharacterContext(false);
    }

    refreshContext();
    return ReinaActiveContextService.subscribe(refreshContext);
  }, []);

  useEffect(() => {
    if (!initialEquipmentId) return;
    void selectEquipment(initialEquipmentId);
  }, [initialEquipmentId]);

  useEffect(() => {
    if (!activeContext?.character || hasAppliedCharacterContext) return;
    if (query || category || weaponType || hands || level || vocation || minSlots || maxWeightOz) return;

    applyCharacterFilters();
  }, [activeContext, hasAppliedCharacterContext, query, category, weaponType, hands, level, vocation, minSlots, maxWeightOz]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const levelNumber = Number(level.replace(/\./g, ""));
        const handsNumber = Number(hands);
        const minSlotsNumber = Number(minSlots.replace(/\./g, ""));
        const maxWeightOzNumber = Number(maxWeightOz.replace(/\./g, "").replace(",", "."));
        const nextResults = await EquipmentSearchClientService.searchEquipment({
          query,
          category,
          weaponType,
          hands: Number.isFinite(handsNumber) && hands.trim() ? handsNumber : null,
          vocation,
          level: Number.isFinite(levelNumber) && level.trim() ? levelNumber : null,
          includeAboveLevel,
          minSlots: Number.isFinite(minSlotsNumber) && minSlots.trim() ? minSlotsNumber : null,
          maxWeightOz: Number.isFinite(maxWeightOzNumber) && maxWeightOz.trim() ? maxWeightOzNumber : null,
          signal: controller.signal
        });
        setResults(nextResults);
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError instanceof Error ? requestError.message : "Erro ao buscar equipamentos.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, category, weaponType, hands, level, includeAboveLevel, vocation, minSlots, maxWeightOz]);

  async function selectEquipment(id: string) {
    setLoading(true);
    setError(null);
    try {
      const equipment = await EquipmentSearchClientService.getEquipment(id);
      setSelectedEquipment(equipment);
      setCompareLeftId((current) => current || equipment.id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao carregar equipamento.");
    } finally {
      setLoading(false);
    }
  }

  async function compareSelected() {
    if (!compareLeftId || !compareRightId) return;
    setLoading(true);
    setError(null);
    try {
      setComparison(await EquipmentSearchClientService.compareEquipment(compareLeftId, compareRightId));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Erro ao comparar equipamentos.");
    } finally {
      setLoading(false);
    }
  }

  function clearFilters() {
    setQuery("");
    setCategory("");
    setWeaponType("");
    setHands("");
    setLevel("");
    setIncludeAboveLevel(true);
    setVocation("");
    setMinSlots("");
    setMaxWeightOz("");
    setHasAppliedCharacterContext(false);
  }

  function applyCharacterFilters() {
    const character = activeContext?.character;
    if (!character) return;
    setLevel(String(character.level || ""));
    setVocation(toEquipmentVocation(character.vocation));
    setHasAppliedCharacterContext(true);
  }

  return {
    activeContext,
    query,
    setQuery,
    category,
    setCategory,
    weaponType,
    setWeaponType,
    hands,
    setHands,
    level,
    setLevel,
    includeAboveLevel,
    setIncludeAboveLevel,
    vocation,
    setVocation,
    minSlots,
    setMinSlots,
    maxWeightOz,
    setMaxWeightOz,
    clearFilters,
    applyCharacterFilters,
    results,
    selectedEquipment,
    selectEquipment,
    compareLeftId,
    setCompareLeftId,
    compareRightId,
    setCompareRightId,
    comparison,
    compareSelected,
    loading,
    error
  };
}

function toEquipmentVocation(vocation: string) {
  const key = vocation.toLowerCase();
  if (key.includes("knight")) return "knight";
  if (key.includes("paladin")) return "paladin";
  if (key.includes("sorcerer")) return "sorcerer";
  if (key.includes("druid")) return "druid";
  if (key.includes("monk")) return "monk";
  return "";
}
