"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { integer, moneySmart } from "@/services/format";
import { getActiveServer, getServerDisplayName } from "@/services/quote-service";
import type { VaultServer } from "@/types/vault";

export function ActiveServerBanner() {
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

  if (!server) {
    return (
      <div className="active-banner" style={{ borderColor: "var(--line)", color: "var(--ink-faint)" }}>
        Nenhum servidor ativo. Configure na <Link href="/cotacao" style={{ color: "var(--gold)" }}>Cotacao Central</Link>.
      </div>
    );
  }

  return (
    <div className="active-banner">
      <span>Servidor ativo:</span>
      <strong style={{ color: "var(--gold)" }}>{getServerDisplayName(server)}</strong>
      <span style={{ color: "var(--ink-dim)" }}>
        1 {server.moeda} = {integer(server.gcPorMoeda)} gc - venda R$ {moneySmart(server.loteVenda / server.lote)} /
        compra R$ {moneySmart(server.loteCompra / server.lote)}
      </span>
      <Link href="/cotacao" style={{ marginLeft: "auto", color: "var(--gold)", textDecoration: "none" }}>
        Editar cotacao
      </Link>
    </div>
  );
}
