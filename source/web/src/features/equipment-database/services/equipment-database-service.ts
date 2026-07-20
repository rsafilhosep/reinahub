import "server-only";
import { getItemImagePath, MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ServerAssetService } from "@/source/web/src/reina-core/assets/server-asset-service";
import { ReinaDataService } from "@/source/web/src/reina-core/database";
import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";
import { rankSearchResults } from "@/source/web/src/reina-core/search";
import equipmentJson from "../data/equipment.json";
import type {
  EquipmentCategory,
  EquipmentCompareMetric,
  EquipmentComparison,
  EquipmentRecord,
  EquipmentSearchResult,
  EquipmentSeedRecord,
  EquipmentWeaponType
} from "../types";
import { createEmptyEquipmentFutureData, formatNumberValue, formatWeight } from "../utils";

const equipmentSeeds = equipmentJson as EquipmentSeedRecord[];

export const EquipmentDatabaseService = {
  getEquipment(idOrName: string): EquipmentRecord | null {
    const lookup = itemLookupKey(idOrName);
    const seed = equipmentSeeds.find((row) => row.id === idOrName || itemLookupKey(row.name) === lookup);
    return seed ? buildEquipmentRecord(seed) : null;
  },

  searchEquipment(
    query: string,
    options?: {
      category?: EquipmentCategory | string | null;
      weaponType?: EquipmentWeaponType | string | null;
      hands?: number | null;
      level?: number | null;
      includeAboveLevel?: boolean;
      vocation?: string | null;
      minSlots?: number | null;
      maxWeightOz?: number | null;
    }
  ): EquipmentSearchResult[] {
    const category = options?.category?.trim() || null;
    const weaponType = options?.weaponType?.trim() || null;
    const hands = typeof options?.hands === "number" && Number.isFinite(options.hands) ? options.hands : null;
    const level = typeof options?.level === "number" && Number.isFinite(options.level) ? options.level : null;
    const includeAboveLevel = options?.includeAboveLevel !== false;
    const vocation = options?.vocation?.trim() || null;
    const minSlots = typeof options?.minSlots === "number" && Number.isFinite(options.minSlots) ? options.minSlots : null;
    const maxWeightOz = typeof options?.maxWeightOz === "number" && Number.isFinite(options.maxWeightOz) ? options.maxWeightOz : null;

    const hasQuery = query.trim().length > 0;
    const baseRows = hasQuery
      ? rankSearchResults(equipmentSeeds, query, (equipment) => `${equipment.name} ${equipment.category} ${equipment.weaponType ?? ""}`)
      : [...equipmentSeeds].sort((a, b) => a.name.localeCompare(b.name));

    return baseRows
      .filter((equipment) => !category || equipment.category === category || equipment.slot === category)
      .filter((equipment) => !weaponType || equipment.weaponType === weaponType)
      .filter((equipment) => hands === null || (equipment.hands ?? 0) === hands)
      .filter((equipment) => includeAboveLevel || level === null || getRequiredLevel(equipment) <= level)
      .filter((equipment) => !vocation || equipmentSupportsVocation(equipment, vocation))
      .filter((equipment) => minSlots === null || (equipment.imbuementSlots ?? 0) >= minSlots)
      .filter((equipment) => maxWeightOz === null || equipment.weightOz == null || equipment.weightOz <= maxWeightOz)
      .sort((a, b) => (hasQuery ? 0 : sortByLevelFit(a, b, level)))
      .slice(0, 80)
      .map((equipment) => buildEquipmentSearchResult(equipment, level));
  },

  compareEquipment(leftId: string, rightId: string): EquipmentComparison | null {
    const left = this.getEquipment(leftId);
    const right = this.getEquipment(rightId);
    if (!left || !right) return null;

    const metrics: EquipmentCompareMetric[] = [
      buildMetric("level", "Level minimo", left.level ?? 0, right.level ?? 0, "lower"),
      buildMetric("attack", "Ataque", left.attack, right.attack, "higher"),
      buildMetric("defense", "Defesa", left.defense, right.defense, "higher"),
      buildMetric("armor", "Armor", left.armor, right.armor, "higher"),
      buildMetric("slots", "Slots imbue", left.imbuementSlots, right.imbuementSlots, "higher"),
      buildMetric("weight", "Peso", left.weightOz, right.weightOz, "lower", " oz"),
      buildMetric("npcPrice", "Preco NPC", left.npcPrice, right.npcPrice, "lower", " gp")
    ];

    return {
      left,
      right,
      metrics,
      summary: buildComparisonSummary(left, right, metrics)
    };
  },

  getCategories() {
    return [
      { key: "", label: "Todos" },
      { key: "weapon", label: "Weapons" },
      { key: "shield", label: "Shields" },
      { key: "armor", label: "Armors" },
      { key: "helmet", label: "Helmets" },
      { key: "legs", label: "Legs" },
      { key: "boots", label: "Boots" },
      { key: "container", label: "Containers" }
    ];
  },

  getWeaponTypes() {
    return [
      { key: "", label: "Todos" },
      { key: "sword", label: "Sword" },
      { key: "axe", label: "Axe" },
      { key: "club", label: "Club" },
      { key: "distance", label: "Distance" },
      { key: "fist", label: "Fist" },
      { key: "wand", label: "Wand" },
      { key: "rod", label: "Rod" },
      { key: "ammo", label: "Ammo" }
    ];
  },

  getVocations() {
    return [
      { key: "", label: "Todas" },
      { key: "knight", label: "Knight" },
      { key: "paladin", label: "Paladin" },
      { key: "sorcerer", label: "Sorcerer" },
      { key: "druid", label: "Druid" },
      { key: "monk", label: "Monk" }
    ];
  }
};

function buildEquipmentRecord(seed: EquipmentSeedRecord): EquipmentRecord {
  const item = ReinaDataService.findItemByName(seed.name);
  const itemId = item?.id ?? null;
  const imagePath = itemId ? getItemImagePath(itemId) : MISSING_ITEM_IMAGE;

  return {
    ...seed,
    level: seed.level ?? 0,
    imbuementSlots: seed.imbuementSlots ?? 0,
    itemId,
    clientId: item?.clientId ?? null,
    npcPrice: itemId ? ReinaDataService.getNpcSellPrice(itemId) : null,
    image: {
      path: imagePath,
      exists: itemId ? ServerAssetService.publicAssetExists(imagePath) : false
    },
    sourceLabel: seed.sourceStatus === "seed" ? "Base inicial revisavel" : "Importado",
    future: createEmptyEquipmentFutureData()
  };
}

function buildEquipmentSearchResult(seed: EquipmentSeedRecord, level: number | null): EquipmentSearchResult {
  const record = buildEquipmentRecord(seed);
  const requiredLevel = getRequiredLevel(record);
  return {
    id: record.id,
    name: record.name,
    category: record.category,
    weaponType: record.weaponType,
    hands: record.hands ?? null,
    level: record.level ?? null,
    requiredLevel,
    isUsableAtLevel: level === null || requiredLevel <= level,
    attack: record.attack ?? null,
    defense: record.defense ?? null,
    armor: record.armor ?? null,
    imbuementSlots: record.imbuementSlots ?? null,
    weightOz: record.weightOz ?? null,
    vocations: record.vocations ?? [],
    itemId: record.itemId,
    image: record.image
  };
}

function getRequiredLevel(seed: EquipmentSeedRecord) {
  return Math.max(0, Number(seed.level) || 0);
}

function sortByLevelFit(left: EquipmentSeedRecord, right: EquipmentSeedRecord, level: number | null) {
  if (level === null) return 0;

  const leftLevel = getRequiredLevel(left);
  const rightLevel = getRequiredLevel(right);
  const leftUsable = leftLevel <= level;
  const rightUsable = rightLevel <= level;

  if (leftUsable !== rightUsable) return leftUsable ? -1 : 1;
  if (leftUsable && rightUsable) return rightLevel - leftLevel;
  return leftLevel - rightLevel;
}

function equipmentSupportsVocation(seed: EquipmentSeedRecord, vocation: string) {
  const normalizedVocation = normalizeVocation(vocation);
  const vocations = seed.vocations ?? [];
  if (vocations.length === 0) return true;

  return vocations.some((entry) => {
    const normalized = normalizeVocation(entry);
    return (
      normalized === "all" ||
      normalized === normalizedVocation ||
      normalized.includes(normalizedVocation) ||
      normalizedVocation.includes(normalized)
    );
  });
}

function normalizeVocation(value: string) {
  const key = itemLookupKey(value).replace(/\s+/g, "");
  if (["todas", "todos", "all", "livre", "free"].includes(key)) return "all";
  if (key.includes("knight")) return "knight";
  if (key.includes("paladin")) return "paladin";
  if (key.includes("sorcerer")) return "sorcerer";
  if (key.includes("druid")) return "druid";
  if (key.includes("monk")) return "monk";
  return key;
}

function buildMetric(
  key: string,
  label: string,
  left: number | null | undefined,
  right: number | null | undefined,
  preference: "higher" | "lower",
  suffix = ""
): EquipmentCompareMetric {
  const hasLeft = typeof left === "number" && Number.isFinite(left);
  const hasRight = typeof right === "number" && Number.isFinite(right);
  let winner: EquipmentCompareMetric["winner"] = "none";

  if (hasLeft && hasRight) {
    if (left === right) winner = "tie";
    else if (preference === "higher") winner = left > right ? "left" : "right";
    else winner = left < right ? "left" : "right";
  }

  const formatter = suffix === " oz" ? formatWeight : (value: number | null | undefined) => formatNumberValue(value, suffix);

  return {
    key,
    label,
    leftValue: formatter(left),
    rightValue: formatter(right),
    winner,
    preference
  };
}

function buildComparisonSummary(left: EquipmentRecord, right: EquipmentRecord, metrics: EquipmentCompareMetric[]) {
  const summary: string[] = [];
  const leftWins = metrics.filter((metric) => metric.winner === "left").length;
  const rightWins = metrics.filter((metric) => metric.winner === "right").length;

  if (leftWins > rightWins) summary.push(`${left.name} vence em mais criterios numericos.`);
  if (rightWins > leftWins) summary.push(`${right.name} vence em mais criterios numericos.`);
  if (leftWins === rightWins) summary.push("Comparacao equilibrada. O contexto da hunt e imbuement decide melhor.");

  if ((left.imbuementSlots ?? 0) !== (right.imbuementSlots ?? 0)) {
    const better = (left.imbuementSlots ?? 0) > (right.imbuementSlots ?? 0) ? left : right;
    summary.push(`${better.name} oferece mais espaco para imbuements.`);
  }

  if (left.category !== right.category || left.weaponType !== right.weaponType) {
    summary.push("Itens de categorias diferentes: compare tambem vocacao, estilo de hunt e disponibilidade no servidor.");
  }

  return summary;
}
