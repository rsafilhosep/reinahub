import type { HuntSession } from "@/types/vault";
import { parseGameNumber } from "./format";
import { ReinaDataService, itemLookupKey } from "@/source/web/src/reina-core/database";
import type { ReinaItem } from "@/source/web/src/reina-core/database";
import { getItemImagePath } from "@/source/web/src/reina-core/assets";

type HuntLootInput = NonNullable<HuntSession["LootedItems"]>[number];

export type EnrichedLootItem = HuntLootInput & {
  itemId?: number;
  normalizedName: string;
  sellPrice?: number;
  totalSellValue?: number;
  imageItemId?: number;
  imagePath: string;
  dataStatus: "matched" | "unmatched";
};

export type HuntSummary = ReturnType<typeof summarizeHunt>;

export function summarizeHunt(data: HuntSession) {
  const kills = data.KilledMonsters ?? [];
  const loot = data.LootedItems ?? [];
  const enrichedLoot = loot.map(enrichLootItem);
  const databaseLootValue = enrichedLoot.reduce((sum, item) => sum + (item.totalSellValue ?? 0), 0);
  const originalLootValue = parseGameNumber(data.Loot);
  const unmatchedLootItems = enrichedLoot.filter((item) => item.dataStatus === "unmatched");

  return {
    balance: parseGameNumber(data.Balance),
    lootValue: databaseLootValue > 0 ? databaseLootValue : originalLootValue,
    originalLootValue,
    databaseLootValue,
    supplies: parseGameNumber(data.Supplies),
    xpGain: parseGameNumber(data.XPGain),
    xpHour: parseGameNumber(data.XPGainHour),
    damage: parseGameNumber(data.Damage),
    damageHour: parseGameNumber(data.DamageHour),
    healing: parseGameNumber(data.Healing),
    totalKills: kills.reduce((acc, monster) => acc + (monster.Count || 0), 0),
    kills: [...kills].sort((a, b) => (b.Count || 0) - (a.Count || 0)),
    loot: [...enrichedLoot].sort((a, b) => (b.Count || 0) - (a.Count || 0)),
    unmatchedLootItems,
    sessionLength: data.SessionLength || "-",
    sessionStart: data.SessionStart || "",
    sessionEnd: data.SessionEnd || ""
  };
}

export function enrichLootItem(item: HuntLootInput): EnrichedLootItem {
  const rawItemId = item.Id ?? item.ID ?? item.ItemId ?? item.itemId;
  const itemId = Number(rawItemId);
  const hasItemId = Number.isFinite(itemId) && itemId > 0;
  const normalizedName = itemLookupKey(item.Name);
  const matchedItem = findLootDatabaseItem(item, hasItemId ? itemId : undefined);
  const sellPrice = matchedItem ? ReinaDataService.getNpcSellPrice(matchedItem.id) ?? undefined : undefined;
  const count = Number(item.Count) || 0;

  return {
    ...item,
    ...(matchedItem ? { itemId: matchedItem.id } : hasItemId ? { itemId } : {}),
    normalizedName,
    ...(sellPrice !== undefined ? { sellPrice, totalSellValue: sellPrice * count } : {}),
    ...(matchedItem ? { imageItemId: matchedItem.id } : {}),
    imagePath: getItemImagePath(matchedItem?.id ?? (hasItemId ? itemId : undefined)),
    dataStatus: matchedItem ? "matched" : "unmatched"
  };
}

function findLootDatabaseItem(item: HuntLootInput, itemId?: number): ReinaItem | null {
  if (itemId) {
    const byId = ReinaDataService.findItemById(itemId);
    if (byId) return byId;
  }

  return ReinaDataService.findItemByName(item.Name);
}
