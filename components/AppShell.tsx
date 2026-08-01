"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { ActiveServerBanner } from "./ActiveServerBanner";
import { BrandMark } from "./BrandMark";
import { CookieConsent } from "./CookieConsent";
import { DashboardProfile } from "./DashboardProfile";
import { GlobalSupportRail } from "./GlobalSupportRail";
import { FirstRunOnboarding } from "./FirstRunOnboarding";
import { HubNav } from "./HubNav";
import { ModuleIcon } from "./ModuleIcon";
import { QuickEconomyConverter } from "@/source/web/src/features/quick-tools/components";
import { ThemeToggle } from "./ThemeProvider";
import { StorageService } from "@/services/storage-service";

export function AppShell({
  current,
  mark,
  subtitle,
  children
}: {
  current: string;
  mark: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setSidebarCollapsed(StorageService.get("reinahub_sidebar_collapsed", false));
  }, []);

  function toggleSidebar() {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    StorageService.set("reinahub_sidebar_collapsed", next);
  }

  return (
    <div className={`app-shell${sidebarCollapsed ? " sidebar-is-collapsed" : ""}`}>
      <HubNav
        collapsed={sidebarCollapsed}
        current={current}
        mobileOpen={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        onToggleCollapsed={toggleSidebar}
      />
      <main className="wrap app-content" data-page={current}>
        <FirstRunOnboarding />
        <header className="topbar">
          {current === "home" ? <DashboardProfile /> : <div className="brand">
            <button
              aria-label="Abrir navegação"
              className="mobile-nav-toggle"
              type="button"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu size={18} />
            </button>
            <BrandMark mark={mark} />
            <div>
              <h1>ReinaHub</h1>
              <div className="brand-subtitle-row">
                <ModuleIcon moduleKey={current} size={22} />
                <p>{subtitle}</p>
              </div>
            </div>
          </div>}
          <div className="topbar-actions">
            <button className="quick-converter-trigger onboarding-trigger" type="button" onClick={() => window.dispatchEvent(new Event("reinahub:open-onboarding"))}>
              <Sparkles size={15} />
              <span>Assistente</span>
            </button>
            <QuickEconomyConverter />
            <ThemeToggle />
          </div>
        </header>
        {current !== "cotacao" ? <ActiveServerBanner /> : null}
        <div className="dashboard-layout">
          <div className="dashboard-main">{children}</div>
          <GlobalSupportRail />
        </div>
        <CookieConsent />
        <footer className="app-footer">
          <span>Valores ilustrativos. Confirme as cotações atuais antes de negociar.</span>
          <Link href="/disclaimer">Isenção de responsabilidade</Link>
        </footer>
      </main>
    </div>
  );
}
