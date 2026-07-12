import {
  Archive,
  BarChart3,
  Boxes,
  Castle,
  Coins,
  Crown,
  Gem,
  PackageSearch,
  PackageOpen,
  UserRound,
  ScrollText,
  Shield,
  Swords,
  Trophy
} from "lucide-react";
import type { ElementType } from "react";
import { getItemImagePath, getMonsterImagePath } from "@/source/web/src/reina-core/assets";

const moduleVisuals: Record<string, { icon: ElementType; sprite?: string; tone?: "gold" | "teal" | "red" }> = {
  cotacao: { icon: Coins, sprite: getItemImagePath(3031), tone: "gold" },
  rc: { icon: Gem, sprite: getItemImagePath(3035), tone: "gold" },
  market: { icon: BarChart3, sprite: getItemImagePath(3031), tone: "teal" },
  hunt: { icon: Swords, sprite: getMonsterImagePath("Dragon"), tone: "red" },
  stash: { icon: PackageOpen, sprite: getItemImagePath(3031), tone: "gold" },
  "premium-goals": { icon: Crown, sprite: getItemImagePath(3035), tone: "gold" },
  "live-goal": { icon: Trophy, sprite: getItemImagePath(3035), tone: "teal" },
  characters: { icon: UserRound, sprite: getItemImagePath(3577), tone: "gold" },
  assets: { icon: Boxes, tone: "teal" },
  loot: { icon: PackageSearch, sprite: getItemImagePath(3003), tone: "gold" },
  imbuement: { icon: ScrollText, sprite: getItemImagePath(3003), tone: "teal" },
  legal: { icon: ScrollText, tone: "gold" },
  monsters: { icon: Castle, sprite: getMonsterImagePath("Demon"), tone: "red" },
  items: { icon: Archive, sprite: getItemImagePath(3003), tone: "gold" },
  npcs: { icon: Shield, tone: "teal" },
  bosses: { icon: Crown, sprite: getMonsterImagePath("Demon"), tone: "red" },
  home: { icon: Castle, tone: "gold" }
};

export function ModuleIcon({
  moduleKey,
  size = 28,
  showSprite = true
}: {
  moduleKey: string;
  size?: number;
  showSprite?: boolean;
}) {
  const visual = moduleVisuals[moduleKey] ?? moduleVisuals.home;
  const Icon = visual.icon;

  return (
    <span className={`module-icon module-icon-${visual.tone ?? "gold"}`} style={{ width: size, height: size }}>
      {showSprite && visual.sprite ? (
        <img
          src={visual.sprite}
          alt=""
          width={size - 8}
          height={size - 8}
          loading="lazy"
          style={{ width: size - 8, height: size - 8, objectFit: "contain", imageRendering: "pixelated" }}
        />
      ) : (
        <Icon size={Math.max(14, size - 12)} aria-hidden="true" />
      )}
    </span>
  );
}
