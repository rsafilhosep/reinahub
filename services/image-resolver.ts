import { assetManifest, type AssetCategory } from "@/source/assets/metadata/asset-manifest";
import {
  MISSING_CREATURE_IMAGE,
  MISSING_ITEM_IMAGE,
  normalizeAssetName as normalizeCoreAssetName
} from "@/source/web/src/reina-core/assets";

type ResolveOptions = {
  category: AssetCategory;
  name: string;
  placeholder?: string;
};

export type GameAssetMetadata = {
  name: string;
  slug: string;
  category: AssetCategory;
  imageUrl: string;
  exists: boolean;
  hp?: number;
  xp?: number;
  loot?: unknown[];
  bestiary?: unknown;
  weakness?: Record<string, number>;
  charm?: string;
  race?: string;
  location?: string[];
  wikiUrl?: string;
};

const resolveCache = new Map<string, GameAssetMetadata>();

const placeholders = {
  monsters: MISSING_CREATURE_IMAGE,
  bosses: MISSING_CREATURE_IMAGE,
  items: MISSING_ITEM_IMAGE,
  npcs: MISSING_CREATURE_IMAGE,
  outfits: MISSING_CREATURE_IMAGE,
  mounts: MISSING_CREATURE_IMAGE,
  spells: MISSING_ITEM_IMAGE,
  icons: MISSING_ITEM_IMAGE
} satisfies Record<AssetCategory, string>;

export function normalizeAssetName(name: string) {
  return normalizeCoreAssetName(name);
}

export function resolveGameAsset(options: ResolveOptions): GameAssetMetadata {
  const slug = normalizeAssetName(options.name);
  const cacheKey = `${options.category}:${slug}`;
  const cached = resolveCache.get(cacheKey);
  if (cached) return cached;

  const imageUrl = assetManifest[options.category][slug];
  const resolved: GameAssetMetadata = {
    name: options.name,
    slug,
    category: options.category,
    imageUrl: imageUrl ?? options.placeholder ?? placeholders[options.category],
    exists: Boolean(imageUrl)
  };

  resolveCache.set(cacheKey, resolved);
  return resolved;
}

export function resolveMonsterImage(name: string) {
  return resolveGameAsset({ category: "monsters", name }).imageUrl;
}

export function resolveItemImage(name: string) {
  return resolveGameAsset({ category: "items", name }).imageUrl;
}

export function resolveNpcImage(name: string) {
  return resolveGameAsset({ category: "npcs", name }).imageUrl;
}

export function clearImageResolverCache() {
  resolveCache.clear();
}
