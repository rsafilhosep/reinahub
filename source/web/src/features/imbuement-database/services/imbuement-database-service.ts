import "server-only";
import { getItemImagePath } from "@/source/web/src/reina-core/assets";
import { ServerAssetService } from "@/source/web/src/reina-core/assets/server-asset-service";
import { ItemDatabaseService } from "@/source/web/src/features/item-database/services";
import { ReinaDataService } from "@/source/web/src/reina-core/database";
import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";
import { rankSearchResults } from "@/source/web/src/reina-core/search";
import imbuementsJson from "../data/imbuements.json";
import { createEmptyImbuementFutureData } from "../utils";
import type { ImbuementDefinition, ImbuementMaterial, ImbuementRecord, ImbuementSearchResult, ItemImbuementUsage } from "../types";

const imbuements = expandImbuementDefinitions(imbuementsJson as ImbuementDefinition[]);
const MATERIAL_NAME_ALIASES: Record<string, string> = {
  [itemLookupKey("mooh'tar shell")]: "mooh'tah shell"
};

export const ImbuementDatabaseService = {
  getImbuement(id: string): ImbuementRecord | null {
    const definition = findImbuementDefinition(id);
    return definition ? buildImbuementRecord(definition) : null;
  },

  searchImbuements(query: string, options?: { tier?: string | null }): ImbuementSearchResult[] {
    const normalizedQuery = itemLookupKey(query);
    const tier = options?.tier?.trim() || null;
    const searchedRows = normalizedQuery
      ? rankSearchResults(imbuements, query, (imbuement) => `${imbuement.name} ${imbuement.group} ${imbuement.tier}`)
      : imbuements;
    const rows = searchedRows.filter((imbuement) => !tier || imbuement.tier === tier);

    return rows.map((definition) => {
      const record = buildImbuementRecord(definition);
      return {
        id: record.id,
        name: record.name,
        group: record.group,
        tier: record.tier,
        materialCount: record.materialCount,
        totalNpcCost: record.totalNpcCost
      };
    });
  },

  getMaterialItems(id: string): ImbuementMaterial[] {
    return this.getImbuement(id)?.materials ?? [];
  },

  getImbuementsUsingItem(item: { itemId?: number | null; name?: string | null }): ItemImbuementUsage[] {
    const itemId = Number(item.itemId);
    const hasItemId = Number.isFinite(itemId) && itemId > 0;
    const normalizedName = item.name ? itemLookupKey(resolveMaterialName(item.name)) : "";

    if (!hasItemId && !normalizedName) return [];

    return imbuements.flatMap((imbuement) =>
      imbuement.materials
        .filter((material) => {
          const matchedItem = ReinaDataService.findItemByName(resolveMaterialName(material.itemName));
          if (hasItemId && matchedItem?.id === itemId) return true;
          return normalizedName.length > 0 && itemLookupKey(resolveMaterialName(material.itemName)) === normalizedName;
        })
        .map((material) => ({
          imbuementId: imbuement.id,
          imbuementName: imbuement.name,
          group: imbuement.group,
          tier: imbuement.tier,
          materialCount: imbuement.materials.length,
          requiredCount: material.count,
          effect: imbuement.effect
        }))
    );
  }
};

function expandImbuementDefinitions(definitions: ImbuementDefinition[]): ImbuementDefinition[] {
  const expanded: ImbuementDefinition[] = [];

  for (const definition of definitions) {
    if (definition.tier !== "powerful" || definition.materials.length < 3) {
      expanded.push(definition);
      continue;
    }

    expanded.push(toTierDefinition(definition, "basic", 1));
    expanded.push(toTierDefinition(definition, "intricate", 2));
    expanded.push(definition);
  }

  return expanded.sort((a, b) => a.group.localeCompare(b.group) || getTierOrder(a.tier) - getTierOrder(b.tier) || a.name.localeCompare(b.name));
}

function toTierDefinition(definition: ImbuementDefinition, tier: "basic" | "intricate", materialCount: number): ImbuementDefinition {
  const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
  const baseName = definition.name.replace(/^Powerful\s+/i, "");

  return {
    ...definition,
    id: `${tier}-${itemLookupKey(baseName).replace(/\s+/g, "-")}`,
    name: `${tierName} ${baseName}`,
    tier,
    materials: definition.materials.slice(0, materialCount)
  };
}

function getTierOrder(tier: string) {
  if (tier === "basic") return 1;
  if (tier === "intricate") return 2;
  return 3;
}

function findImbuementDefinition(idOrName: string) {
  const normalized = itemLookupKey(idOrName);
  return imbuements.find((imbuement) => itemLookupKey(imbuement.id) === normalized || itemLookupKey(imbuement.name) === normalized) ?? null;
}

function buildImbuementRecord(definition: ImbuementDefinition): ImbuementRecord {
  const materials = definition.materials.map((material) => enrichMaterial(material));
  const matchedMaterialCount = materials.filter((material) => material.dataStatus === "matched").length;
  const pricedMaterials = materials.filter((material) => material.totalNpcValue !== null);
  const totalNpcCost = pricedMaterials.length === materials.length ? pricedMaterials.reduce((sum, material) => sum + (material.totalNpcValue ?? 0), 0) : null;

  return {
    id: definition.id,
    name: definition.name,
    group: definition.group,
    tier: definition.tier,
    effect: definition.effect,
    materials,
    materialCount: materials.length,
    matchedMaterialCount,
    totalNpcCost,
    future: createEmptyImbuementFutureData()
  };
}

function enrichMaterial(material: { itemName: string; count: number }): ImbuementMaterial {
  const item = ReinaDataService.findItemByName(resolveMaterialName(material.itemName));
  const itemId = item?.id ?? null;
  const npcPrice = itemId ? ReinaDataService.getNpcSellPrice(itemId) : null;
  const imagePath = itemId ? getItemImagePath(itemId) : getItemImagePath(null);
  const droppedBy = itemId ? ItemDatabaseService.getDroppedBy(itemId) : [];

  return {
    ...material,
    itemId,
    resolvedName: item?.name ?? material.itemName,
    npcPrice,
    totalNpcValue: npcPrice !== null ? npcPrice * material.count : null,
    imagePath,
    hasImage: ServerAssetService.publicAssetExists(imagePath),
    itemHref: itemId ? `/items?itemId=${itemId}` : null,
    droppedBy: droppedBy.slice(0, 8),
    droppedByCount: droppedBy.length,
    dataStatus: item ? "matched" : "unmatched"
  };
}

function resolveMaterialName(itemName: string) {
  return MATERIAL_NAME_ALIASES[itemLookupKey(itemName)] ?? itemName;
}
