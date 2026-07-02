"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getActiveServer, getServerWorldName } from "@/services/quote-service";
import type { VaultServer } from "@/types/vault";

const modules = [
  { key: "cotacao", label: "Cotacao Central", href: "/cotacao" },
  { key: "rc", label: "Calculadora RC", href: "/calculadora-rc" },
  { key: "market", label: "Market Analyzer", href: "/market" },
  { key: "hunt", label: "Hunt Analyzer", href: "/hunt" },
  { key: "assets", label: "Assets Manager", href: "/assets" },
  { key: "loot", label: "Loot Analyzer (em breve)", href: "" },
  { key: "imbuement", label: "Imbuement Calculator (em breve)", href: "" }
];

const databaseModules = [
  { key: "monsters", label: "Monster Database", href: "/monsters" },
  { key: "items", label: "Item Database", href: "/items" }
];

export function HubNav({ current }: { current: string }) {
  const [server, setServer] = useState<VaultServer | null>(null);

  useEffect(() => {
    const sync = () => setServer(getActiveServer());
    sync();
    window.addEventListener("reinahub:quote-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("reinahub:quote-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return (
    <nav className="hub-nav">
      {modules.map((mod) => {
        const label = mod.key === "cotacao" && server ? `${mod.label} - ${getServerWorldName(server)}` : mod.label;
        if (!mod.href) {
          return (
            <span className="hub-link disabled" key={mod.key}>
              {label}
            </span>
          );
        }
        return (
          <Link className={`hub-link${current === mod.key ? " active" : ""}`} href={mod.href} key={mod.key}>
            {label}
          </Link>
        );
      })}
      <span className="eyebrow" style={{ display: "inline-flex", alignItems: "center", padding: "0 4px" }}>
        Database
      </span>
      {databaseModules.map((mod) => (
        <Link className={`hub-link${current === mod.key ? " active" : ""}`} href={mod.href} key={mod.key}>
          {mod.label}
        </Link>
      ))}
    </nav>
  );
}
