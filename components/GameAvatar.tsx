"use client";

import {
  resolveGameAsset,
  resolveItemImage,
  resolveMonsterImage,
  resolveNpcImage,
  type GameAssetMetadata
} from "@/services/image-resolver";
import type { AssetCategory } from "@/source/assets/metadata/asset-manifest";

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

  return (
    <img
      src={src}
      alt={name}
      title={metadata.exists ? name : `${name} (placeholder)`}
      className={className}
      width={size}
      height={size}
      loading="lazy"
      data-asset-category={category}
      data-asset-slug={metadata.slug}
      style={{ width: size, height: size, imageRendering: "pixelated", objectFit: "contain" }}
    />
  );
}

export function MonsterAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="monsters" resolver={resolveMonsterImage} />;
}

export function ItemAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="items" resolver={resolveItemImage} />;
}

export function NpcAvatar(props: AvatarProps) {
  return <GameAvatar {...props} category="npcs" resolver={resolveNpcImage} />;
}

