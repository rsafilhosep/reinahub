"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "./BrandMark";
import { ModuleIcon } from "./ModuleIcon";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";

type NavItem = {
  key: string;
  label: string;
  href: string;
};

const navigationSections: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Hub",
    items: [
      { key: "home", label: "Dashboard", href: "/" },
      { key: "updates", label: "Atualizações", href: "/updates" },
      { key: "cotacao", label: "Cotação Central", href: "/cotacao" },
      { key: "rc", label: "Calculadora RC", href: "/calculadora-rc" },
      { key: "market", label: "Market Analyzer", href: "/market" },
      { key: "hunt", label: "Hunt Analyzer", href: "/hunt" },
      { key: "stash", label: "Stash", href: "/stash" },
      { key: "characters", label: "Characters", href: "/characters" }
    ]
  },
  {
    title: "Objetivos",
    items: [
      { key: "premium-goals", label: "Premium Goals", href: "/premium-goals" },
      { key: "live-goal", label: "Live Goal", href: "/live-goal" }
    ]
  },
  {
    title: "Database",
    items: [
      { key: "monsters", label: "Monster Database", href: "/monsters" },
      { key: "items", label: "Item Database", href: "/items" },
      { key: "equipment", label: "Equipment Database", href: "/equipment" },
      { key: "npcs", label: "NPC Hub", href: "/npcs" },
      { key: "imbuement", label: "Imbuement Database", href: "/imbuements" },
      { key: "loot", label: "Loot Analyzer", href: "" }
    ]
  },
  {
    title: "Sistema",
    items: [
      { key: "assets", label: "Assets Manager", href: "/assets" },
      { key: "legal", label: "Isenção", href: "/disclaimer" }
    ]
  }
];

export function HubNav({
  collapsed,
  current,
  mobileOpen,
  onCloseMobile,
  onToggleCollapsed
}: {
  collapsed: boolean;
  current: string;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapsed: () => void;
}) {
  const [economy, setEconomy] = useState<ReinaEconomyContext | null>(null);

  useEffect(() => {
    const sync = () => setEconomy(ReinaEconomyService.getActiveContext());
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  return (
    <>
      <div className={`sidebar-backdrop${mobileOpen ? " open" : ""}`} onClick={onCloseMobile} />
      <aside className={`hub-sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`} aria-label="Navegação principal">
        <div className="sidebar-header">
          <Link className="sidebar-brand" href="/" onClick={onCloseMobile}>
            <BrandMark mark="RH" variant="crest" />
            <span className="sidebar-brand-text">
              <strong>ReinaHub</strong>
              <small>Vault Tools</small>
            </span>
          </Link>
          <button
            className="sidebar-icon-button sidebar-collapse-button"
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Mostrar lista do menu" : "Mostrar apenas ícones"}
            title={collapsed ? "Mostrar lista" : "Mostrar ícones"}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
          <button className="sidebar-icon-button sidebar-close-button" type="button" onClick={onCloseMobile} aria-label="Fechar navegação">
            <X size={17} />
          </button>
        </div>

        <div className="sidebar-motto" aria-hidden={collapsed}>
          Sua jornada no Tibia, organizada.
        </div>

        <div className="sidebar-view-hint" aria-hidden="true">
          <span>{collapsed ? "Ícones" : "Lista"}</span>
          <strong>{collapsed ? "modo compacto" : "menu completo"}</strong>
        </div>

        <nav className="sidebar-nav">
          {navigationSections.map((section) => (
            <section className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map((item) => (
                <SidebarItem
                  current={current}
                  economy={economy}
                  item={item}
                  key={item.key}
                  onNavigate={onCloseMobile}
                />
              ))}
            </section>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-sigil-row" aria-hidden="true">
            <ModuleIcon moduleKey="cotacao" size={30} showSprite />
            <ModuleIcon moduleKey="hunt" size={30} showSprite />
            <ModuleIcon moduleKey="stash" size={30} showSprite />
          </div>
          <span>Perfil ativo</span>
          <strong>{economy ? `${economy.platformName} - ${economy.worldName}` : "Carregando"}</strong>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({
  current,
  economy,
  item,
  onNavigate
}: {
  current: string;
  economy: ReinaEconomyContext | null;
  item: NavItem;
  onNavigate: () => void;
}) {
  const label = item.key === "cotacao" && economy?.worldName ? `${item.label} - ${economy.worldName}` : item.label;
  const content = (
    <>
      <ModuleIcon moduleKey={item.key} size={30} showSprite />
      <span className="sidebar-item-label">{label}</span>
    </>
  );

  if (!item.href) {
    return (
      <span className="sidebar-item disabled" title={label}>
        {content}
      </span>
    );
  }

  return (
    <Link className={`sidebar-item${current === item.key ? " active" : ""}`} href={item.href} title={label} onClick={onNavigate}>
      {content}
    </Link>
  );
}
