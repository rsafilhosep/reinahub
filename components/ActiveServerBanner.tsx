"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { currencyShortName, integer, moneySmart } from "@/services/format";
import { ReinaActiveContextService, type ReinaActiveContext } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { loadServers } from "@/services/quote-service";
import type { VaultServer } from "@/types/vault";

export function ActiveServerBanner() {
  const [activeContext, setActiveContext] = useState<ReinaActiveContext | null>(null);
  const [servers, setServers] = useState<VaultServer[]>([]);

  useEffect(() => {
    const sync = () => {
      setActiveContext(ReinaActiveContextService.getActiveContext());
      setServers(loadServers());
    };
    sync();
    return ReinaActiveContextService.subscribe(sync);
  }, []);

  const economy = activeContext?.economy;

  if (!economy?.server) {
    return (
      <div className="active-banner" style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}>
        Nenhum servidor ativo. Escolha um mundo na <Link href="/cotacao" style={{ color: "var(--gold)" }}>Cotação Central</Link> para liberar conversões em GC, moeda premium e R$.
      </div>
    );
  }

  return (
    <div className="active-banner">
      <div className="active-banner-main">
        <span>Contexto ativo:</span>
        <strong>{activeContext?.displayName ?? economy.serverName}</strong>
        <span>
          1 {currencyShortName(economy.currencyName)} = {integer(economy.goldPerPremium)} GC - venda R$ {moneySmart(economy.sellUnitPrice)} /
          compra R$ {moneySmart(economy.buyUnitPrice)}
        </span>
      </div>
      <div className="active-banner-controls">
        <select
          aria-label="Trocar servidor ativo"
          value={economy.serverId ?? ""}
          onChange={(event) => ReinaActiveContextService.setActiveServer(event.target.value)}
        >
          {servers.map((server) => (
            <option value={server.id} key={server.id}>
              {ReinaEconomyService.getDisplayName(server)}
            </option>
          ))}
        </select>
        <Link href="/cotacao">Gerenciar</Link>
      </div>
    </div>
  );
}
