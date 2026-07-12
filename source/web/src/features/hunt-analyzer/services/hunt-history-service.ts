import { StorageService } from "@/services/storage-service";
import type { HuntSummary } from "@/services/hunt-service";
import type { VaultServer } from "@/types/vault";
import { ReinaActiveContextService, type ReinaActiveContext } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";

const HUNT_HISTORY_KEY = "reinahub_hunt_history";
const HUNT_HISTORY_LIMIT = 200;

export type HuntHistoryRecord = {
  id: string;
  createdAt: number;
  sourceName: string;
  profileId?: string | null;
  profileName?: string | null;
  characterId?: string | null;
  characterName?: string | null;
  serverId: string | null;
  serverName: string | null;
  summary: HuntSummary;
};

export type HuntHistoryTotals = {
  huntCount: number;
  totalBalance: number;
  totalLootValue: number;
  totalSupplies: number;
  totalXpGain: number;
  averageXpHour: number;
  totalKills: number;
};

export type HuntHistoryItemStat = {
  name: string;
  count: number;
  huntCount: number;
  totalSellValue: number;
  imagePath: string | null;
};

export type HuntHistoryMonsterStat = {
  name: string;
  count: number;
  huntCount: number;
};

export type HuntHistoryComparison = {
  base: HuntHistoryRecord;
  compare: HuntHistoryRecord;
  metrics: Array<{
    label: string;
    baseValue: number;
    compareValue: number;
    diff: number;
      unit: string;
  }>;
};

export type HuntHistoryEntityComparison = {
  name: string;
  baseCount: number;
  compareCount: number;
  diff: number;
  baseValue: number;
  compareValue: number;
  valueDiff: number;
};

export type HuntHistoryPeriod = "all" | "7d" | "30d" | "custom";

export class HuntHistoryService {
  static load() {
    return StorageService.get<HuntHistoryRecord[]>(HUNT_HISTORY_KEY, []).map(normalizeRecord);
  }

  static loadForActiveContext() {
    return this.filterByActiveContext(this.load());
  }

  static save(records: HuntHistoryRecord[]) {
    StorageService.set(HUNT_HISTORY_KEY, sortHistory(records).slice(0, HUNT_HISTORY_LIMIT));
  }

  static add(summary: HuntSummary, sourceName: string, server: VaultServer | null) {
    const record = createRecord(summary, sourceName, server);
    const next = sortHistory([record, ...this.load()]).slice(0, HUNT_HISTORY_LIMIT);
    this.save(next);
    return this.filterByActiveContext(next);
  }

  static addMany(entries: Array<{ summary: HuntSummary; sourceName: string }>, server: VaultServer | null) {
    const records = entries.map((entry) => createRecord(entry.summary, entry.sourceName, server));
    const next = sortHistory([...records, ...this.load()]).slice(0, HUNT_HISTORY_LIMIT);
    this.save(next);
    return this.filterByActiveContext(next);
  }

  static remove(id: string) {
    const next = this.load().filter((record) => record.id !== id);
    this.save(next);
    return this.filterByActiveContext(next);
  }

  static clear() {
    const context = ReinaActiveContextService.getActiveContext();
    const next = this.load().filter((record) => !matchesContext(record, context));
    this.save(next);
    return this.filterByActiveContext(next);
  }

  static clearAll() {
    StorageService.remove(HUNT_HISTORY_KEY);
    return [];
  }

  static filterByActiveContext(records: HuntHistoryRecord[]) {
    const context = ReinaActiveContextService.getActiveContext();
    return records.filter((record) => matchesContext(record, context));
  }

  static summarize(records: HuntHistoryRecord[]): HuntHistoryTotals {
    const huntCount = records.length;
    const totalXpHour = records.reduce((sum, record) => sum + record.summary.xpHour, 0);

    return {
      huntCount,
      totalBalance: records.reduce((sum, record) => sum + record.summary.balance, 0),
      totalLootValue: records.reduce((sum, record) => sum + record.summary.lootValue, 0),
      totalSupplies: records.reduce((sum, record) => sum + record.summary.supplies, 0),
      totalXpGain: records.reduce((sum, record) => sum + record.summary.xpGain, 0),
      averageXpHour: huntCount ? totalXpHour / huntCount : 0,
      totalKills: records.reduce((sum, record) => sum + record.summary.totalKills, 0)
    };
  }

  static getItemStats(records: HuntHistoryRecord[], query = "") {
    const normalizedQuery = query.trim().toLowerCase();
    const stats = new Map<string, HuntHistoryItemStat>();

    for (const record of records) {
      const seenInHunt = new Set<string>();
      for (const item of record.summary.loot) {
        const key = item.normalizedName || item.Name.toLowerCase();
        const current = stats.get(key) ?? {
          name: item.Name,
          count: 0,
          huntCount: 0,
          totalSellValue: 0,
          imagePath: item.imagePath || null
        };
        current.count += Number(item.Count) || 0;
        current.totalSellValue += item.totalSellValue ?? 0;
        current.imagePath = current.imagePath || item.imagePath || null;
        if (!seenInHunt.has(key)) {
          current.huntCount += 1;
          seenInHunt.add(key);
        }
        stats.set(key, current);
      }
    }

    return Array.from(stats.values())
      .filter((item) => !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.count - a.count || b.totalSellValue - a.totalSellValue || a.name.localeCompare(b.name));
  }

  static filterByPeriod(records: HuntHistoryRecord[], period: HuntHistoryPeriod, customStart = "", customEnd = "") {
    if (period === "all") return records;

    const now = Date.now();
    let start = 0;
    let end = now;

    if (period === "7d") {
      start = now - 7 * 24 * 60 * 60 * 1000;
    } else if (period === "30d") {
      start = now - 30 * 24 * 60 * 60 * 1000;
    } else {
      start = customStart ? new Date(`${customStart}T00:00:00`).getTime() : 0;
      end = customEnd ? new Date(`${customEnd}T23:59:59`).getTime() : now;
    }

    return records.filter((record) => record.createdAt >= start && record.createdAt <= end);
  }

  static getMonsterStats(records: HuntHistoryRecord[], query = "") {
    const normalizedQuery = query.trim().toLowerCase();
    const stats = new Map<string, HuntHistoryMonsterStat>();

    for (const record of records) {
      const seenInHunt = new Set<string>();
      for (const monster of record.summary.kills) {
        const key = monster.Name.toLowerCase();
        const current = stats.get(key) ?? {
          name: monster.Name,
          count: 0,
          huntCount: 0
        };
        current.count += Number(monster.Count) || 0;
        if (!seenInHunt.has(key)) {
          current.huntCount += 1;
          seenInHunt.add(key);
        }
        stats.set(key, current);
      }
    }

    return Array.from(stats.values())
      .filter((monster) => !normalizedQuery || monster.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }

  static compare(base: HuntHistoryRecord, compare: HuntHistoryRecord): HuntHistoryComparison {
    return {
      base,
      compare,
      metrics: [
        {
          label: "Balance",
          baseValue: base.summary.balance,
          compareValue: compare.summary.balance,
          diff: compare.summary.balance - base.summary.balance,
          unit: "gp"
        },
        {
          label: "Loot",
          baseValue: base.summary.lootValue,
          compareValue: compare.summary.lootValue,
          diff: compare.summary.lootValue - base.summary.lootValue,
          unit: "gp"
        },
        {
          label: "Supplies",
          baseValue: base.summary.supplies,
          compareValue: compare.summary.supplies,
          diff: compare.summary.supplies - base.summary.supplies,
          unit: "gp"
        },
        {
          label: "XP/h",
          baseValue: base.summary.xpHour,
          compareValue: compare.summary.xpHour,
          diff: compare.summary.xpHour - base.summary.xpHour,
          unit: "xp"
        },
        {
          label: "XP ganho",
          baseValue: base.summary.xpGain,
          compareValue: compare.summary.xpGain,
          diff: compare.summary.xpGain - base.summary.xpGain,
          unit: "xp"
        },
        {
          label: "Kills",
          baseValue: base.summary.totalKills,
          compareValue: compare.summary.totalKills,
          diff: compare.summary.totalKills - base.summary.totalKills,
          unit: "kills"
        },
        {
          label: "Materiais imbue",
          baseValue: base.summary.imbuementSummary.totalMaterialCount,
          compareValue: compare.summary.imbuementSummary.totalMaterialCount,
          diff: compare.summary.imbuementSummary.totalMaterialCount - base.summary.imbuementSummary.totalMaterialCount,
          unit: "itens"
        }
      ]
    };
  }

  static compareItem(base: HuntHistoryRecord, compare: HuntHistoryRecord, itemName: string): HuntHistoryEntityComparison | null {
    const normalizedName = itemName.trim().toLowerCase();
    if (!normalizedName) return null;

    const baseItems = base.summary.loot.filter((item) => item.Name.toLowerCase().includes(normalizedName));
    const compareItems = compare.summary.loot.filter((item) => item.Name.toLowerCase().includes(normalizedName));
    const name = baseItems[0]?.Name ?? compareItems[0]?.Name ?? itemName;
    const baseCount = baseItems.reduce((sum, item) => sum + (Number(item.Count) || 0), 0);
    const compareCount = compareItems.reduce((sum, item) => sum + (Number(item.Count) || 0), 0);
    const baseValue = baseItems.reduce((sum, item) => sum + (item.totalSellValue ?? 0), 0);
    const compareValue = compareItems.reduce((sum, item) => sum + (item.totalSellValue ?? 0), 0);

    return {
      name,
      baseCount,
      compareCount,
      diff: compareCount - baseCount,
      baseValue,
      compareValue,
      valueDiff: compareValue - baseValue
    };
  }

  static compareMonster(base: HuntHistoryRecord, compare: HuntHistoryRecord, monsterName: string): HuntHistoryEntityComparison | null {
    const normalizedName = monsterName.trim().toLowerCase();
    if (!normalizedName) return null;

    const baseMonsters = base.summary.kills.filter((monster) => monster.Name.toLowerCase().includes(normalizedName));
    const compareMonsters = compare.summary.kills.filter((monster) => monster.Name.toLowerCase().includes(normalizedName));
    const name = baseMonsters[0]?.Name ?? compareMonsters[0]?.Name ?? monsterName;
    const baseCount = baseMonsters.reduce((sum, monster) => sum + (Number(monster.Count) || 0), 0);
    const compareCount = compareMonsters.reduce((sum, monster) => sum + (Number(monster.Count) || 0), 0);

    return {
      name,
      baseCount,
      compareCount,
      diff: compareCount - baseCount,
      baseValue: 0,
      compareValue: 0,
      valueDiff: 0
    };
  }
}

function createRecord(summary: HuntSummary, sourceName: string, server: VaultServer | null): HuntHistoryRecord {
  const context = ReinaActiveContextService.getActiveContext();
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: inferHuntTimestamp(summary) ?? Date.now(),
    sourceName,
    profileId: context.profileId,
    profileName: context.profile?.name ?? null,
    characterId: context.characterId,
    characterName: context.character?.name ?? null,
    serverId: server?.id ?? context.serverId,
    serverName: server ? ReinaEconomyService.getDisplayName(server) : context.economy.serverName,
    summary
  };
}

function normalizeRecord(record: HuntHistoryRecord): HuntHistoryRecord {
  return {
    ...record,
    profileId: record.profileId ?? null,
    profileName: record.profileName ?? null,
    characterId: record.characterId ?? null,
    characterName: record.characterName ?? null
  };
}

function matchesContext(record: HuntHistoryRecord, context: ReinaActiveContext) {
  const normalizedRecord = normalizeRecord(record);
  if (normalizedRecord.profileId) return normalizedRecord.profileId === context.profileId;
  if (normalizedRecord.characterId) return normalizedRecord.characterId === context.characterId;
  if (normalizedRecord.serverId && context.serverId) return normalizedRecord.serverId === context.serverId;
  return true;
}

function sortHistory(records: HuntHistoryRecord[]) {
  return [...records].sort((a, b) => b.createdAt - a.createdAt);
}

function inferHuntTimestamp(summary: HuntSummary) {
  const candidates = [summary.sessionStart, summary.sessionEnd].filter(Boolean);
  for (const value of candidates) {
    const parsed = parseHuntDate(value);
    if (parsed) return parsed;
  }
  return null;
}

function parseHuntDate(value: string) {
  const normalized = value.trim();
  const isoMatch = normalized.match(/^(\d{4})-(\d{2})-(\d{2})(?:,\s*|\s+T?)(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoMatch) {
    const [, year, month, day, hour, minute, second = "0"] = isoMatch;
    const timestamp = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)).getTime();
    return Number.isFinite(timestamp) ? timestamp : null;
  }

  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}
