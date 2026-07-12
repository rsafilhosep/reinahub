"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ModuleIcon } from "./ModuleIcon";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";

const modules = [
  { key: "cotacao", label: "Cotacao Central", href: "/cotacao" },
  { key: "rc", label: "Calculadora RC", href: "/calculadora-rc" },
  { key: "market", label: "Market Analyzer", href: "/market" },
  { key: "hunt", label: "Hunt Analyzer", href: "/hunt" },
  { key: "stash", label: "Stash", href: "/stash" },
  { key: "characters", label: "Characters", href: "/characters" },
  { key: "premium-goals", label: "Premium Goals", href: "/premium-goals" },
  { key: "live-goal", label: "Live Goal", href: "/live-goal" },
  { key: "assets", label: "Assets Manager", href: "/assets" },
  { key: "loot", label: "Loot Analyzer (em breve)", href: "" },
  { key: "imbuement", label: "Imbuement Database", href: "/imbuements" }
];

const databaseModules = [
  { key: "monsters", label: "Monster Database", href: "/monsters" },
  { key: "items", label: "Item Database", href: "/items" }
];

export function HubNav({ current }: { current: string }) {
  const [economy, setEconomy] = useState<ReinaEconomyContext | null>(null);

  useEffect(() => {
    const sync = () => setEconomy(ReinaEconomyService.getActiveContext());
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  return (
    <nav className="hub-nav">
      {modules.map((mod) => {
        const label = mod.key === "cotacao" && economy?.worldName ? `${mod.label} - ${economy.worldName}` : mod.label;
        if (!mod.href) {
          return (
            <span className="hub-link disabled" key={mod.key}>
              <ModuleIcon moduleKey={mod.key} size={22} showSprite={false} />
              {label}
            </span>
          );
        }
        return (
          <Link className={`hub-link${current === mod.key ? " active" : ""}`} href={mod.href} key={mod.key}>
            <ModuleIcon moduleKey={mod.key} size={22} showSprite={false} />
            {label}
          </Link>
        );
      })}
      <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
        Database
      </span>
      {databaseModules.map((mod) => (
        <Link className={`hub-link${current === mod.key ? " active" : ""}`} href={mod.href} key={mod.key}>
          <ModuleIcon moduleKey={mod.key} size={22} showSprite={false} />
          {mod.label}
        </Link>
      ))}
    </nav>
  );
}
