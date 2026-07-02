"use client";

import { HubNav } from "./HubNav";
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
          <div className="brand-mark">{mark}</div>
          <div>
            <h1>ReinaHub</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <ThemeToggle />
      </header>
      <HubNav current={current} />
      {children}
      <footer>Valores ilustrativos. Confirme as cotacoes atuais antes de negociar.</footer>
    </div>
  );
}
