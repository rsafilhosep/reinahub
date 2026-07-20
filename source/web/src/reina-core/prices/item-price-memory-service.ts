"use client";

import { StorageService } from "@/services/storage-service";
import type { VaultServer } from "@/types/vault";

export type ItemPriceMemorySource =
  | "npc"
  | "market-manual"
  | "stash-manual"
  | "imbuement-market"
  | "last-analysis";

export type ItemPriceMemoryEntry = {
  value: number;
  source: ItemPriceMemorySource;
  updatedAt: number;
  context?: string;
};

export type ItemPriceMemoryRecord = {
  key: string;
  serverId: string;
  itemId: number;
  itemName: string;
  prices: Partial<Record<ItemPriceMemorySource, ItemPriceMemoryEntry>>;
  updatedAt: number;
};

export type ItemPriceMemorySuggestion = ItemPriceMemoryEntry & {
  itemId: number;
  itemName: string;
  serverId: string;
  label: string;
};

const ITEM_PRICE_MEMORY_KEY = "reinahub_item_price_memory_v1";
const SOURCE_PRIORITY: ItemPriceMemorySource[] = [
  "market-manual",
  "last-analysis",
  "stash-manual",
  "imbuement-market",
  "npc"
];

const SOURCE_LABELS: Record<ItemPriceMemorySource, string> = {
  npc: "NPC",
  "market-manual": "Market salvo",
  "stash-manual": "Stash",
  "imbuement-market": "Imbuement",
  "last-analysis": "Ultima analise"
};

export const ItemPriceMemoryService = {
  load() {
    return StorageService.get<ItemPriceMemoryRecord[]>(ITEM_PRICE_MEMORY_KEY, []).map(normalizeRecord);
  },

  save(records: ItemPriceMemoryRecord[]) {
    StorageService.set(ITEM_PRICE_MEMORY_KEY, records.map(normalizeRecord));
    notifyPriceMemoryChanged();
  },

  getRecord(server: VaultServer | null, itemId: number | null | undefined) {
    if (!server?.id || !itemId) return null;
    const key = getRecordKey(server.id, itemId);
    return this.load().find((record) => record.key === key) ?? null;
  },

  rememberPrice({
    server,
    itemId,
    itemName,
    source,
    value,
    context
  }: {
    server: VaultServer | null;
    itemId: number | null | undefined;
    itemName: string;
    source: ItemPriceMemorySource;
    value: number;
    context?: string;
  }) {
    const safeValue = normalizePrice(value);
    if (!server?.id || !itemId || safeValue <= 0) return null;

    const key = getRecordKey(server.id, itemId);
    const now = Date.now();
    const records = this.load();
    const existing = records.find((record) => record.key === key);
    const entry: ItemPriceMemoryEntry = {
      value: safeValue,
      source,
      updatedAt: now,
      ...(context ? { context } : {})
    };

    const nextRecord: ItemPriceMemoryRecord = normalizeRecord({
      key,
      serverId: server.id,
      itemId,
      itemName: itemName.trim() || existing?.itemName || `Item #${itemId}`,
      prices: {
        ...(existing?.prices ?? {}),
        [source]: entry
      },
      updatedAt: now
    });

    const next = existing
      ? records.map((record) => (record.key === key ? nextRecord : record))
      : [nextRecord, ...records];

    this.save(next.slice(0, 2000));
    return nextRecord;
  },

  getBestPrice(
    server: VaultServer | null,
    itemId: number | null | undefined,
    options: { includeNpc?: boolean } = {}
  ): ItemPriceMemorySuggestion | null {
    const record = this.getRecord(server, itemId);
    if (!record) return null;
    const includeNpc = options.includeNpc ?? true;
    const orderedSources = includeNpc ? SOURCE_PRIORITY : SOURCE_PRIORITY.filter((source) => source !== "npc");

    for (const source of orderedSources) {
      const entry = record.prices[source];
      if (entry && entry.value > 0) {
        return {
          ...entry,
          itemId: record.itemId,
          itemName: record.itemName,
          serverId: record.serverId,
          label: SOURCE_LABELS[source]
        };
      }
    }

    return null;
  },

  getSourceLabel(source: ItemPriceMemorySource) {
    return SOURCE_LABELS[source];
  },

  subscribe(callback: () => void) {
    window.addEventListener("storage", callback);
    window.addEventListener("reinahub:item-price-memory-change", callback);
    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener("reinahub:item-price-memory-change", callback);
    };
  }
};

function getRecordKey(serverId: string, itemId: number) {
  return `${serverId}:${itemId}`;
}

function normalizeRecord(record: ItemPriceMemoryRecord): ItemPriceMemoryRecord {
  return {
    key: record.key || getRecordKey(record.serverId, record.itemId),
    serverId: String(record.serverId ?? ""),
    itemId: Math.max(0, Math.trunc(Number(record.itemId) || 0)),
    itemName: String(record.itemName ?? "").trim(),
    prices: normalizePrices(record.prices ?? {}),
    updatedAt: Number(record.updatedAt) || Date.now()
  };
}

function normalizePrices(prices: Partial<Record<ItemPriceMemorySource, ItemPriceMemoryEntry>>) {
  return Object.entries(prices).reduce<Partial<Record<ItemPriceMemorySource, ItemPriceMemoryEntry>>>((acc, [source, entry]) => {
    if (!isKnownSource(source) || !entry) return acc;
    const value = normalizePrice(entry.value);
    if (value <= 0) return acc;
    acc[source] = {
      value,
      source,
      updatedAt: Number(entry.updatedAt) || Date.now(),
      ...(entry.context ? { context: String(entry.context) } : {})
    };
    return acc;
  }, {});
}

function normalizePrice(value: number) {
  return Math.max(0, Math.trunc(Number(value) || 0));
}

function isKnownSource(source: string): source is ItemPriceMemorySource {
  return ["npc", "market-manual", "stash-manual", "imbuement-market", "last-analysis"].includes(source);
}

function notifyPriceMemoryChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("reinahub:item-price-memory-change"));
}

