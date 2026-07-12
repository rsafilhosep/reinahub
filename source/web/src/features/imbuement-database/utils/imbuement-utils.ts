import type { ImbuementRecord } from "../types";

export function createEmptyImbuementFutureData(): ImbuementRecord["future"] {
  return {
    marketCost: null,
    history: [],
    profitSimulation: null,
    vocations: [],
    equipmentSlots: [],
    npc: null,
    wikiUrl: null
  };
}
