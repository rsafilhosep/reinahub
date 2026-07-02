import { itemLookupKey } from "@/source/web/src/reina-core/database";

export const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";
export const MISSING_CREATURE_IMAGE = "/assets/icons/missing-creature.svg";

export function getItemImagePath(itemId?: number | string | null) {
  const normalizedId = Number(itemId);
  if (!Number.isFinite(normalizedId) || normalizedId <= 0) return MISSING_ITEM_IMAGE;
  return `/assets/items/${Math.trunc(normalizedId)}.gif`;
}

export function getMonsterImagePath(monsterName?: string | null) {
  const slug = normalizeAssetName(monsterName);
  return slug ? `/assets/monsters/${slug}.gif` : MISSING_CREATURE_IMAGE;
}

export function getNpcImagePath(npcName?: string | null) {
  const slug = normalizeAssetName(npcName);
  return slug ? `/assets/npcs/${slug}.gif` : MISSING_CREATURE_IMAGE;
}

export function getBossImagePath(bossName?: string | null) {
  const slug = normalizeAssetName(bossName);
  return slug ? `/assets/bosses/${slug}.gif` : MISSING_CREATURE_IMAGE;
}

function normalizeAssetName(name?: string | null) {
  return itemLookupKey(name ?? "").replace(/\s+/g, "-");
}

