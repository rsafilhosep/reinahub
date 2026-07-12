import type { HuntSession } from "@/types/vault";
import { parseGameNumber } from "./format";
import { ReinaDataService } from "@/source/web/src/reina-core/database";
import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";
import type { ReinaItem } from "@/source/web/src/reina-core/database";
import { getItemImagePath } from "@/source/web/src/reina-core/assets";
import { ImbuementDatabaseService } from "@/source/web/src/features/imbuement-database/services";
import type { ItemImbuementUsage } from "@/source/web/src/features/imbuement-database/types";

type HuntLootInput = NonNullable<HuntSession["LootedItems"]>[number];

const LOOT_COVERAGE_THRESHOLD = 0.8;

export type LootValueSource = "database" | "game" | "none";

export type EnrichedLootItem = HuntLootInput & {
  itemId?: number;
  normalizedName: string;
  sellPrice?: number;
  totalSellValue?: number;
  imageItemId?: number;
  imagePath: string;
  imbuementUsages: ItemImbuementUsage[];
  isImbuementMaterial: boolean;
  dataStatus: "matched" | "unmatched";
};

export type HuntImbuementSummary = {
  totalMaterialTypes: number;
  totalMaterialCount: number;
  relatedImbuements: Array<{
    imbuementId: string;
    imbuementName: string;
    group: string;
    tier: string;
    materialTypesInHunt: number;
    totalLootedMaterialCount: number;
  }>;
};

export type HuntSummary = ReturnType<typeof summarizeHunt>;

export function summarizeHunt(data: HuntSession) {
  const kills = data.KilledMonsters ?? [];
  const loot = data.LootedItems ?? [];
  const enrichedLoot = loot.map(enrichLootItem);
  const databaseLootValue = enrichedLoot.reduce((sum, item) => sum + (item.totalSellValue ?? 0), 0);
  const originalLootValue = parseGameNumber(data.Loot);
  const unmatchedLootItems = enrichedLoot.filter((item) => item.dataStatus === "unmatched");
  const imbuementSummary = summarizeImbuementMaterials(enrichedLoot);
  const totalLootTypes = enrichedLoot.length;
  const pricedLootTypes = enrichedLoot.filter((item) => item.sellPrice !== undefined).length;
  const lootCoverage = totalLootTypes > 0 ? pricedLootTypes / totalLootTypes : 0;
  const hasGameValue = originalLootValue > 0;
  const hasDatabaseValue = databaseLootValue > 0;
  const preferDatabase = hasDatabaseValue && (!hasGameValue || lootCoverage >= LOOT_COVERAGE_THRESHOLD);
  const lootValue = preferDatabase ? databaseLootValue : hasGameValue ? originalLootValue : databaseLootValue;
  const lootValueSource: LootValueSource = preferDatabase
    ? "database"
    : hasGameValue
      ? "game"
      : hasDatabaseValue
        ? "database"
        : "none";

  return {
    balance: parseGameNumber(data.Balance),
    lootValue,
    lootValueSource,
    lootCoverage,
    pricedLootTypes,
    totalLootTypes,
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
    imbuementSummary,
    imbuementLootItems: enrichedLoot.filter((item) => item.isImbuementMaterial),
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
  const imbuementUsages = ImbuementDatabaseService.getImbuementsUsingItem({
    itemId: matchedItem?.id ?? (hasItemId ? itemId : null),
    name: matchedItem?.name ?? item.Name
  });

  return {
    ...item,
    ...(matchedItem ? { itemId: matchedItem.id } : hasItemId ? { itemId } : {}),
    normalizedName,
    ...(sellPrice !== undefined ? { sellPrice, totalSellValue: sellPrice * count } : {}),
    ...(matchedItem ? { imageItemId: matchedItem.id } : {}),
    imagePath: getItemImagePath(matchedItem?.id ?? (hasItemId ? itemId : undefined)),
    imbuementUsages,
    isImbuementMaterial: imbuementUsages.length > 0,
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

function summarizeImbuementMaterials(items: EnrichedLootItem[]): HuntImbuementSummary {
  const imbuementMap = new Map<string, HuntImbuementSummary["relatedImbuements"][number]>();
  const imbuementMaterialItems = items.filter((item) => item.isImbuementMaterial);

  for (const item of imbuementMaterialItems) {
    for (const usage of item.imbuementUsages) {
      const current = imbuementMap.get(usage.imbuementId) ?? {
        imbuementId: usage.imbuementId,
        imbuementName: usage.imbuementName,
        group: usage.group,
        tier: usage.tier,
        materialTypesInHunt: 0,
        totalLootedMaterialCount: 0
      };
      current.materialTypesInHunt += 1;
      current.totalLootedMaterialCount += Number(item.Count) || 0;
      imbuementMap.set(usage.imbuementId, current);
    }
  }

  return {
    totalMaterialTypes: imbuementMaterialItems.length,
    totalMaterialCount: imbuementMaterialItems.reduce((sum, item) => sum + (Number(item.Count) || 0), 0),
    relatedImbuements: [...imbuementMap.values()].sort(
      (a, b) => b.materialTypesInHunt - a.materialTypesInHunt || b.totalLootedMaterialCount - a.totalLootedMaterialCount
    )
  };
}
