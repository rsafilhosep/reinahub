"use client";

import {
  resolveGameAsset,
  resolveItemImage,
  type GameAssetMetadata
} from "@/services/image-resolver";
import type { AssetCategory } from "@/source/assets/metadata/asset-manifest";
import {
  MISSING_CREATURE_IMAGE,
  MISSING_ITEM_IMAGE,
  getMonsterImagePath,
  getNpcImagePath,
  normalizeAssetName
} from "@/source/web/src/reina-core/assets";

type AvatarProps = {
  name: string;
  size?: number;
  className?: string;
};

type BaseAvatarProps = AvatarProps & {
  category: AssetCategory;
  resolver: (name: string) => string;
};

function GameAvatar({ name, size = 32, className = "", category, resolver }: BaseAvatarProps) {
  const src = resolver(name);
  const metadata: GameAssetMetadata = resolveGameAsset({ category, name });
  const slug = normalizeAssetName(name);
  const fallback = category === "items" ? MISSING_ITEM_IMAGE : MISSING_CREATURE_IMAGE;

  return (
    <img
      src={src}
      alt={name}
      title={metadata.exists || src ? name : `${name} (placeholder)`}
      className={className}
      width={size}
      height={size}
      loading="lazy"
      data-asset-category={category}
      data-asset-slug={metadata.slug || slug}
      onError={(event) => {
        if (event.currentTarget.src.endsWith(fallback)) return;
        event.currentTarget.src = fallback;
      }}
      style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain" }}
    />
  );
}

export function MonsterAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="monsters" resolver={getMonsterImagePath} />;
}

export function ItemAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="items" resolver={resolveItemImage} />;
}

export function NpcAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="npcs" resolver={getNpcImagePath} />;
}
