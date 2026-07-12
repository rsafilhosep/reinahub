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
    "item-placeholder": "/assets/icons/missing-item.svg",
    "monster-placeholder": "/assets/icons/missing-creature.svg",
    "npc-placeholder": "/assets/icons/missing-creature.svg"
  }
};
