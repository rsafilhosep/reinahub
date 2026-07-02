import { assetManifest, type AssetCategory } from "@/source/assets/metadata/asset-manifest";

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

const normalizeCache = new Map<string, string>();
const resolveCache = new Map<string, GameAssetMetadata>();

const placeholders = {
  monsters: "/images/icons/monster-placeholder.png",
  bosses: "/images/icons/monster-placeholder.png",
  items: "/images/icons/item-placeholder.png",
  npcs: "/images/icons/npc-placeholder.png",
  outfits: "/images/icons/npc-placeholder.png",
  mounts: "/images/icons/npc-placeholder.png",
  spells: "/images/icons/item-placeholder.png",
  icons: "/images/icons/item-placeholder.png"
} satisfies Record<AssetCategory, string>;

export function normalizeAssetName(name: string) {
  const cached = normalizeCache.get(name);
  if (cached) return cached;

  const normalized = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['`´’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");

  normalizeCache.set(name, normalized);
  return normalized;
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
  normalizeCache.clear();
  resolveCache.clear();
}

