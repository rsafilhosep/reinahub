"use client";

import Link from "next/link";
import { ActiveServerBanner } from "./ActiveServerBanner";
import { BrandMark } from "./BrandMark";
import { HubNav } from "./HubNav";
import { ModuleIcon } from "./ModuleIcon";
import { ThemeToggle } from "./ThemeProvider";

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
  return (
    <div className="wrap">
      <header className="topbar">
        <div className="brand">
          <BrandMark mark={mark} />
          <div>
            <h1>ReinaHub</h1>
            <div className="brand-subtitle-row">
              <ModuleIcon moduleKey={current} size={22} />
              <p>{subtitle}</p>
            </div>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <HubNav current={current} />
      {current !== "cotacao" ? <ActiveServerBanner /> : null}
      {children}
      <footer className="app-footer">
        <span>Valores ilustrativos. Confirme as cotacoes atuais antes de negociar.</span>
        <Link href="/disclaimer">Isencao de responsabilidade</Link>
      </footer>
    </div>
  );
}
