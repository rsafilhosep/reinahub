import type { NpcFutureData } from "../types";

export function createEmptyNpcFutureData(): NpcFutureData {
  return {
    city: null,
    coordinates: null,
    map: null,
    travel: [],
    quests: [],
    bless: null,
    promotion: null,
    boat: null,
    carpet: null,
    bank: null,
    mail: null,
    guild: null,
    outfits: [],
    mounts: [],
    imbuements: [],
    forge: null,
    dailyTasks: []
  };
}
