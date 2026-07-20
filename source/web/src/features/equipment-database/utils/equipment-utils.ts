import type { EquipmentCategory, EquipmentFutureData, EquipmentWeaponType } from "../types";

export function createEmptyEquipmentFutureData(): EquipmentFutureData {
  return {
    market: null,
    priceHistory: [],
    setSynergy: [],
    imbuements: [],
    vocationRecommendations: [],
    huntingProfiles: [],
    upgradePath: [],
    forge: null,
    wikiSnapshot: null
  };
}

export function formatEquipmentCategory(category: EquipmentCategory | string) {
  const labels: Record<string, string> = {
    weapon: "Weapon",
    shield: "Shield",
    armor: "Armor",
    helmet: "Helmet",
    legs: "Legs",
    boots: "Boots",
    amulet: "Amulet",
    ring: "Ring",
    container: "Container"
  };
  return labels[category] ?? titleCase(category);
}

export function formatWeaponType(type?: EquipmentWeaponType | string) {
  if (!type) return "-";
  const labels: Record<string, string> = {
    sword: "Sword",
    axe: "Axe",
    club: "Club",
    fist: "Fist",
    distance: "Distance",
    wand: "Wand",
    rod: "Rod",
    ammo: "Ammo"
  };
  return labels[type] ?? titleCase(type);
}

export function formatNumberValue(value: number | null | undefined, suffix = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toLocaleString("pt-BR")}${suffix}`;
}

export function formatWeight(value: number | null | undefined) {
  return formatNumberValue(value, " oz");
}

function titleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
