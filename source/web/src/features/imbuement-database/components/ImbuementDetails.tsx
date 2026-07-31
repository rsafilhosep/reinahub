"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { integer, money, moneySmart } from "@/services/format";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { ItemPriceMemorySuggestion } from "@/source/web/src/reina-core/prices";
import type { VaultServer } from "@/types/vault";
import { ImbuementInsightService } from "../services/imbuement-insight-service";
import { ImbuementMarketService, type ImbuementMarketPriceMap, type ImbuementMarketSnapshot } from "../services/imbuement-market-service";
import type { ImbuementRecord } from "../types";

export function ImbuementDetails({ imbuement }: { imbuement: ImbuementRecord | null }) {
  const [marketPrices, setMarketPrices] = useState<ImbuementMarketPriceMap>({});
  const [server, setServer] = useState<VaultServer | null>(null);
  const [snapshots, setSnapshots] = useState<ImbuementMarketSnapshot[]>([]);

  useEffect(() => {
    const activeServer = ReinaEconomyService.getActiveContext().server;
    setServer(activeServer);
    setMarketPrices(ImbuementInsightService.mergeSavedMaterialPrices(ImbuementMarketService.loadPrices(activeServer), imbuement, activeServer));
    setSnapshots(ImbuementMarketService.loadSnapshots());

    function syncQuote() {
      const nextServer = ReinaEconomyService.getActiveContext().server;
      setServer(nextServer);
      setMarketPrices(ImbuementInsightService.mergeSavedMaterialPrices(ImbuementMarketService.loadPrices(nextServer), imbuement, nextServer));
    }

    return ReinaEconomyService.subscribe(syncQuote);
  }, [imbuement]);

  const economySummary = useMemo(() => {
    return ImbuementInsightService.summarizeWorkflow(imbuement, marketPrices, server);
  }, [imbuement, marketPrices, server]);

  const priceSuggestions = useMemo(() => {
    if (!imbuement) return {};
    return ImbuementInsightService.getMaterialPriceSuggestions(imbuement, server);
  }, [imbuement, server]);

  if (!imbuement) {
    return (
      <EmptyState
        moduleKey="imbuement"
        title="Escolha um imbuement"
        description="Selecione um imbuement na lista ao lado para ver materiais, referência NPC, preço de Market, equivalência em moeda premium e fontes de drop."
      />
    );
  }

  const activeImbuement = imbuement;

  function updateMarketPrice(material: ImbuementRecord["materials"][number], key: string, value: string) {
    const numericValue = Number(value);
    const next = { ...marketPrices };
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      delete next[key];
    } else {
      next[key] = numericValue;
      ImbuementInsightService.rememberMaterialPrice(material, numericValue, server, "input");
    }
    setMarketPrices(next);
    ImbuementMarketService.savePrices(server, next);
  }

  function clearImbuementPrices() {
    const next = { ...marketPrices };
    for (const material of activeImbuement.materials) {
      delete next[ImbuementMarketService.getMaterialPriceKey(material)];
    }
    setMarketPrices(next);
    ImbuementMarketService.savePrices(server, next);
  }

  function applyPriceSuggestions() {
    const next = { ...marketPrices };
    let changed = false;

    for (const material of activeImbuement.materials) {
      const key = ImbuementMarketService.getMaterialPriceKey(material);
      const current = next[key];
      const suggestion = priceSuggestions[key];
      if (!suggestion || (Number.isFinite(current) && current > 0)) continue;
      next[key] = suggestion.value;
      ImbuementInsightService.rememberMaterialPrice(material, suggestion.value, server, "suggestion");
      changed = true;
    }

    if (!changed) return;
    setMarketPrices(next);
    ImbuementMarketService.savePrices(server, next);
  }

  function applyMaterialSuggestion(material: ImbuementRecord["materials"][number], key: string, suggestion: ItemPriceMemorySuggestion) {
    const next = { ...marketPrices, [key]: suggestion.value };
    setMarketPrices(next);
    ImbuementInsightService.rememberMaterialPrice(material, suggestion.value, server, "material-suggestion");
    ImbuementMarketService.savePrices(server, next);
  }

  function saveSnapshot() {
    if (!server || economySummary.total === null) return;
    ImbuementInsightService.rememberImbuementMaterialPrices(activeImbuement, marketPrices, server, "snapshot");
    const next = ImbuementMarketService.createSnapshot({
      imbuement: activeImbuement,
      server,
      prices: marketPrices,
      summary: {
        pricedCount: economySummary.pricedCount,
        total: economySummary.total,
        missingCount: economySummary.missingCount,
        premium: economySummary.premium,
        brl: economySummary.brl
      },
      existingSnapshots: snapshots
    });
    setSnapshots(next);
  }

  function clearSnapshotsForImbuement() {
    const next = ImbuementMarketService.clearSnapshotsForImbuement(snapshots, activeImbuement.id, server?.id ?? "");
    setSnapshots(next);
  }

  const visibleSnapshots = snapshots
    .filter((snapshot) => snapshot.imbuementId === activeImbuement.id && snapshot.serverId === (server?.id ?? ""))
    .slice(0, 5);
  const suggestionCount = activeImbuement.materials.filter((material) => {
    const key = ImbuementMarketService.getMaterialPriceKey(material);
    const current = marketPrices[key];
    return priceSuggestions[key] && (!Number.isFinite(current) || current <= 0);
  }).length;

  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="label">{imbuement.group}</div>
        <div className="value gold">{imbuement.name}</div>
        <div className="note" style={{ marginTop: 8 }}>{imbuement.effect}</div>
      </div>

      <div className="hero-grid">
        <Metric label="Tier" value={formatText(imbuement.tier)} />
        <Metric label="Materiais" value={`${imbuement.materialCount}`} />
        <Metric label="Materiais encontrados" value={`${imbuement.matchedMaterialCount}`} />
        <Metric label="Referência NPC" value={economySummary.npcReferenceTotal !== null ? `${integer(economySummary.npcReferenceTotal)} gp` : `${economySummary.npcPricedCount}/${imbuement.materialCount}`} />
        <Metric label="Custo Market" value={economySummary.total !== null ? `${integer(economySummary.total)} gp` : `${economySummary.pricedCount}/${imbuement.materialCount}`} />
        <Metric label={server ? `Em ${server.moeda}` : "Moeda premium"} value={economySummary.total !== null && server ? moneySmart(economySummary.premium, 8) : "-"} />
        <Metric label="Equivalência R$" value={economySummary.total !== null && server ? `R$ ${money(economySummary.brl, 2)}` : "-"} />
        <Metric label="Farmáveis" value={`${economySummary.farmableCount}/${imbuement.materialCount}`} />
        <Metric label="Com preço Market" value={`${economySummary.buyableCount}/${imbuement.materialCount}`} />
      </div>

      <div className="market-card" style={{ marginTop: 18 }}>
        <div className="label">Simulação econômica</div>
        <div className="note" style={{ marginTop: 8 }}>
          {economySummary.total !== null && server
            ? `Custo total calculado com preços de Market preenchidos. Cotação ativa: ${ReinaEconomyService.getDisplayName(server)}.`
            : economySummary.nextAction}
        </div>
        <div className="note" style={{ marginTop: 8 }}>
          Precos salvos para: {server ? ReinaEconomyService.getDisplayName(server) : "perfil geral"}.
        </div>
        <div className="quick-row" style={{ marginTop: 12 }}>
          <span className="quick-btn">Farmáveis {economySummary.farmableCount}</span>
          <span className="quick-btn">Com preço {economySummary.buyableCount}</span>
          <span className="quick-btn">Revisar dados {economySummary.missingDataCount}</span>
        </div>
      </div>

      <div className="quick-row" style={{ marginTop: 18 }}>
        <button className="quick-btn primary" type="button" onClick={saveSnapshot} disabled={!server || economySummary.total === null}>
          Salvar snapshot
        </button>
        {suggestionCount > 0 ? (
          <button className="quick-btn" type="button" onClick={applyPriceSuggestions}>
            Aplicar {suggestionCount} sugestao{suggestionCount === 1 ? "" : "es"}
          </button>
        ) : null}
        <button className="quick-btn danger" type="button" onClick={clearImbuementPrices}>
          Limpar preços deste imbuement
        </button>
        {visibleSnapshots.length > 0 ? (
          <button className="quick-btn danger" type="button" onClick={clearSnapshotsForImbuement}>
            Limpar histórico
          </button>
        ) : null}
      </div>

      {visibleSnapshots.length > 0 ? (
        <div className="history-list" style={{ marginTop: 18 }}>
          {visibleSnapshots.map((snapshot, index) => {
            const previous = visibleSnapshots[index + 1];
            const diff = previous ? snapshot.totalMarketCost - previous.totalMarketCost : null;
            return (
              <div className="history-item" key={snapshot.id}>
                <span>
                  {new Date(snapshot.createdAt).toLocaleString("pt-BR")}
                  <span className="note" style={{ marginLeft: 10 }}>{snapshot.serverName}</span>
                </span>
                <span style={{ color: "var(--gold)" }}>
                  {integer(snapshot.totalMarketCost)} gp
                  {diff !== null ? (
                    <span className="note" style={{ marginLeft: 10 }}>
                      {diff === 0 ? "sem variação" : `${diff > 0 ? "+" : ""}${integer(diff)} gp`}
                    </span>
                  ) : null}
                </span>
              </div>
            );
          })}
        </div>
      ) : null}

      <div className="history-list" style={{ marginTop: 18 }}>
        {imbuement.materials.map((material) => {
          const priceKey = ImbuementMarketService.getMaterialPriceKey(material);
          const unitMarketPrice = marketPrices[priceKey] ?? "";
          const totalMarketValue = typeof unitMarketPrice === "number" ? unitMarketPrice * material.count : null;
          const insight = ImbuementInsightService.getMaterialInsight(material, unitMarketPrice);
          const suggestion = priceSuggestions[priceKey];

          return (
          <div className="history-item" key={`${imbuement.id}-${material.itemName}`} style={{ display: "block" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <img
                  src={material.imagePath}
                  alt=""
                  width={28}
                  height={28}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.src = MISSING_ITEM_IMAGE;
                  }}
                  style={{ width: 28, height: 28, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
                />
                {material.itemHref ? (
                  <Link href={material.itemHref} style={{ color: "inherit", textDecoration: "none" }}>
                    {material.count}x {material.resolvedName}
                  </Link>
                ) : (
                  <span>{material.count}x {material.resolvedName}</span>
                )}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span style={{ color: "var(--ink-dim)" }}>
                  NPC ref. {material.totalNpcValue !== null ? `${integer(material.totalNpcValue)} gp` : "-"}
                </span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <span className="label" style={{ margin: 0 }}>Market</span>
                  <input
                    aria-label={`Preco market unitario de ${material.resolvedName}`}
                    type="number"
                    min="0"
                    value={unitMarketPrice}
                    onChange={(event) => updateMarketPrice(material, priceKey, event.target.value)}
                    style={{ width: 110, minHeight: 34, padding: "8px 10px" }}
                  />
                </label>
                <span style={{ color: "var(--gold)", minWidth: 92, textAlign: "right" }}>
                  {totalMarketValue !== null ? `${integer(totalMarketValue)} gp` : "-"}
                </span>
              </span>
            </div>
            <div className="quick-row" style={{ marginTop: 10 }}>
              <span className={`quick-btn ${insight.status === "balanced" ? "primary" : ""}`} title={insight.description}>
                {insight.label}
              </span>
              {insight.canFarm ? <span className="quick-btn">{material.droppedByCount} fonte{material.droppedByCount === 1 ? "" : "s"} de drop</span> : null}
              {insight.hasMarketPrice ? <span className="quick-btn">Market informado</span> : null}
              {suggestion && !insight.hasMarketPrice ? (
                <button
                  className="quick-btn"
                  type="button"
                  onClick={() => applyMaterialSuggestion(material, priceKey, suggestion)}
                  title={`Preço sugerido: ${integer(suggestion.value)} gp via ${suggestion.label}`}
                >
                  Sugestão {integer(suggestion.value)} gp
                </button>
              ) : null}
            </div>
            <DropSources material={material} />
          </div>
          );
        })}
      </div>
    </div>
  );
}

function DropSources({ material }: { material: ImbuementRecord["materials"][number] }) {
  if (!material.droppedByCount) {
    return <div className="note" style={{ marginTop: 10 }}>Drops ainda não encontrados na base local.</div>;
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
      {material.droppedBy.map((monster) => (
        <Link
          href={`/monsters?monster=${encodeURIComponent(monster.normalizedName)}`}
          key={`${material.itemName}-${monster.monsterName}`}
          className="quick-btn"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", minHeight: 30, padding: "5px 9px" }}
        >
          <img
            src={monster.imagePath}
            alt=""
            width={20}
            height={20}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.src = MISSING_CREATURE_IMAGE;
            }}
            style={{ width: 20, height: 20, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
          />
          {monster.monsterName}
        </Link>
      ))}
      {material.droppedByCount > material.droppedBy.length ? (
        <span className="quick-btn" style={{ minHeight: 30, padding: "5px 9px" }}>
          +{material.droppedByCount - material.droppedBy.length}
        </span>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="hero-card">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}

function formatText(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
