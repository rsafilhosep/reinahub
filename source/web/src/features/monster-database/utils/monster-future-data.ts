import type { MonsterFutureData } from "../types";

export function createEmptyMonsterFutureData(): MonsterFutureData {
  return {
    bestiary: null,
    charms: [],
    spawn: null,
    respawn: null,
    resistances: {},
    weaknesses: {},
    relatedBoss: null,
    location: null,
    map: null,
    strategies: [],
    recommendedVocations: [],
    averageProfit: null
  };
}
