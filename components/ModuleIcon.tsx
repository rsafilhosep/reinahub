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
  Newspaper,
  ListChecks,
  UserRound,
  ScrollText,
  Settings,
  Shield,
  Swords,
  Trophy
} from "lucide-react";
import type { ElementType } from "react";
const iconAsset = (name: string) => `/visual/nav-icons/${name}.png`;

const moduleVisuals: Record<string, { icon: ElementType; sprite?: string; tone?: "gold" | "teal" | "red" }> = {
  cotacao: { icon: Coins, sprite: iconAsset("cotacao"), tone: "gold" },
  rc: { icon: Gem, sprite: iconAsset("rc"), tone: "gold" },
  market: { icon: BarChart3, sprite: iconAsset("market"), tone: "teal" },
  hunt: { icon: Swords, sprite: iconAsset("hunt"), tone: "red" },
  stash: { icon: PackageOpen, sprite: iconAsset("stash"), tone: "gold" },
  "premium-goals": { icon: Crown, sprite: iconAsset("premium-goals"), tone: "gold" },
  "live-goal": { icon: Trophy, sprite: iconAsset("live-goal"), tone: "teal" },
  characters: { icon: UserRound, sprite: iconAsset("characters"), tone: "gold" },
  assets: { icon: Boxes, sprite: iconAsset("assets"), tone: "teal" },
  loot: { icon: PackageSearch, sprite: iconAsset("loot"), tone: "gold" },
  imbuement: { icon: ScrollText, sprite: iconAsset("imbuement"), tone: "teal" },
  legal: { icon: ScrollText, sprite: iconAsset("legal"), tone: "gold" },
  monsters: { icon: Castle, sprite: iconAsset("monsters"), tone: "red" },
  items: { icon: Archive, sprite: iconAsset("items"), tone: "gold" },
  equipment: { icon: Swords, sprite: iconAsset("equipment"), tone: "gold" },
  npcs: { icon: Shield, sprite: iconAsset("npcs"), tone: "teal" },
  bosses: { icon: Crown, sprite: iconAsset("bosses"), tone: "red" },
  updates: { icon: Newspaper, sprite: iconAsset("updates"), tone: "gold" },
  "closed-test": { icon: ListChecks, tone: "teal" },
  settings: { icon: Settings, tone: "teal" },
  home: { icon: Castle, sprite: iconAsset("home"), tone: "gold" }
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
