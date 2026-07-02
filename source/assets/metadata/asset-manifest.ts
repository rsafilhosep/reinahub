export type AssetCategory =
  | "monsters"
  | "items"
  | "npcs"
  | "bosses"
  | "outfits"
  | "mounts"
  | "spells"
  | "icons";

export type AssetManifest = Record<AssetCategory, Record<string, string>>;

export const assetManifest: AssetManifest = {
  "monsters": {},
  "items": {},
  "npcs": {},
  "bosses": {},
  "outfits": {},
  "mounts": {},
  "spells": {},
  "icons": {
    "item-placeholder": "/images/icons/item-placeholder.png",
    "monster-placeholder": "/images/icons/monster-placeholder.png",
    "npc-placeholder": "/images/icons/npc-placeholder.png"
  }
};
