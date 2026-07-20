"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { integer, money, moneySmart } from "@/services/format";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { ItemPriceMemoryService, type ItemPriceMemorySuggestion } from "@/source/web/src/reina-core/prices";
import type { VaultServer } from "@/types/vault";
import { ImbuementMarketService, type ImbuementMarketPriceMap, type ImbuementMarketSnapshot } from "../services/imbuement-market-service";
import type { ImbuementRecord } from "../types";

export function ImbuementDetails({ imbuement }: { imbuement: ImbuementRecord | null }) {
  const [marketPrices, setMarketPrices] = useState<ImbuementMarketPriceMap>({});
  const [server, setServer] = useState<VaultServer | null>(null);
  const [snapshots, setSnapshots] = useState<ImbuementMarketSnapshot[]>([]);

  useEffect(() => {
    const activeServer = ReinaEconomyService.getActiveContext().server;
    setServer(activeServer);
    setMarketPrices(mergeSavedMaterialPrices(ImbuementMarketService.loadPrices(activeServer), imbuement, activeServer));
    setSnapshots(ImbuementMarketService.loadSnapshots());

    function syncQuote() {
      const nextServer = ReinaEconomyService.getActiveContext().server;
      setServer(nextServer);
      setMarketPrices(mergeSavedMaterialPrices(ImbuementMarketService.loadPrices(nextServer), imbuement, nextServer));
    }

    return ReinaEconomyService.subscribe(syncQuote);
  }, [imbuement]);

  const economySummary = useMemo(() => {
    if (!imbuement) {
      return {
        marketPricedCount: 0,
        marketTotal: null as number | null,
        npcPricedCount: 0,
        npcReferenceTotal: null as number | null,
        missingMarketCount: 0,
        premium: 0,
        brl: 0,
        farmableCount: 0,
        buyableCount: 0,
        missingDataCount: 0
      };
    }

    const marketSummary = ImbuementMarketService.summarizeImbuement(imbuement, marketPrices, server);
    const npcPricedValues = imbuement.materials
      .map((material) => material.totalNpcValue)
      .filter((value): value is number => value !== null);
    const npcReferenceTotal = npcPricedValues.length === imbuement.materials.length ? npcPricedValues.reduce((sum, value) => sum + value, 0) : null;
    const materialInsights = imbuement.materials.map((material) => getMaterialInsight(material, marketPrices[ImbuementMarketService.getMaterialPriceKey(material)]));

    return {
      marketPricedCount: marketSummary.pricedCount,
      marketTotal: marketSummary.total,
      npcPricedCount: npcPricedValues.length,
      npcReferenceTotal,
      missingMarketCount: marketSummary.missingCount,
      premium: marketSummary.premium,
      brl: marketSummary.brl,
      farmableCount: materialInsights.filter((insight) => insight.canFarm).length,
      buyableCount: materialInsights.filter((insight) => insight.hasMarketPrice).length,
      missingDataCount: materialInsights.filter((insight) => insight.status === "missing-data").length
    };
  }, [imbuement, marketPrices, server]);

  const priceSuggestions = useMemo(() => {
    if (!imbuement) return {};
    return getMaterialPriceSuggestions(imbuement, server);
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
      rememberMaterialPrice(material, numericValue, server, "input");
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

  function saveSnapshot() {
    if (!server || economySummary.marketTotal === null) return;
    rememberImbuementMaterialPrices(activeImbuement, marketPrices, server, "snapshot");
    const next = ImbuementMarketService.createSnapshot({
      imbuement: activeImbuement,
      server,
      prices: marketPrices,
      summary: {
        pricedCount: economySummary.marketPricedCount,
        total: economySummary.marketTotal,
        missingCount: economySummary.missingMarketCount,
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
        <Metric label="Custo Market" value={economySummary.marketTotal !== null ? `${integer(economySummary.marketTotal)} gp` : `${economySummary.marketPricedCount}/${imbuement.materialCount}`} />
        <Metric label={server ? `Em ${server.moeda}` : "Moeda premium"} value={economySummary.marketTotal !== null && server ? moneySmart(economySummary.premium, 8) : "-"} />
        <Metric label="Equivalência R$" value={economySummary.marketTotal !== null && server ? `R$ ${money(economySummary.brl, 2)}` : "-"} />
        <Metric label="Farmáveis" value={`${economySummary.farmableCount}/${imbuement.materialCount}`} />
        <Metric label="Com preço Market" value={`${economySummary.buyableCount}/${imbuement.materialCount}`} />
      </div>

      <div className="market-card" style={{ marginTop: 18 }}>
        <div className="label">Simulação econômica</div>
        <div className="note" style={{ marginTop: 8 }}>
          {economySummary.marketTotal !== null && server
            ? `Custo total calculado com preços de Market preenchidos. Cotação ativa: ${ReinaEconomyService.getDisplayName(server)}.`
            : economySummary.missingMarketCount > 0
              ? `Preencha ${economySummary.missingMarketCount} preço(s) de Market para calcular custo total, moeda premium e reais.`
              : "Configure a Cotação Central para converter o custo em moeda premium e reais."}
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
        <button className="quick-btn primary" type="button" onClick={saveSnapshot} disabled={!server || economySummary.marketTotal === null}>
          Salvar snapshot
        </button>
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
          const insight = getMaterialInsight(material, unitMarketPrice);
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
                <span className="quick-btn" title={`Preço sugerido: ${integer(suggestion.value)} gp via ${suggestion.label}`}>
                  Sugestão {integer(suggestion.value)} gp
                </span>
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

function getMaterialInsight(material: ImbuementRecord["materials"][number], unitMarketPrice: number | "") {
  const hasMarketPrice = typeof unitMarketPrice === "number" && Number.isFinite(unitMarketPrice) && unitMarketPrice > 0;
  const canFarm = material.droppedByCount > 0;

  if (material.dataStatus === "unmatched") {
    return {
      status: "missing-data",
      label: "Revisar item",
      description: "Material ainda não foi encontrado na base local.",
      hasMarketPrice,
      canFarm
    };
  }

  if (hasMarketPrice && canFarm) {
    return {
      status: "balanced",
      label: "Comprar ou farmar",
      description: "Tem preço de Market e fontes de drop locais para comparar.",
      hasMarketPrice,
      canFarm
    };
  }

  if (hasMarketPrice) {
    return {
      status: "market-only",
      label: "Comprar no Market",
      description: "Tem preço informado, mas ainda não temos fonte de drop local.",
      hasMarketPrice,
      canFarm
    };
  }

  if (canFarm) {
    return {
      status: "farm-only",
      label: "Farmar ou precificar",
      description: "Tem fonte de drop local, mas falta preço de Market.",
      hasMarketPrice,
      canFarm
    };
  }

  return {
    status: "needs-price",
    label: "Sem preço/drop",
    description: "Falta preço de Market e fonte de drop local.",
    hasMarketPrice,
    canFarm
  };
}

function mergeSavedMaterialPrices(prices: ImbuementMarketPriceMap, imbuement: ImbuementRecord | null, server: VaultServer | null) {
  if (!imbuement || !server) return prices;

  let changed = false;
  const next = { ...prices };
  for (const material of imbuement.materials) {
    if (!material.itemId) continue;

    const key = ImbuementMarketService.getMaterialPriceKey(material);
    const current = next[key];
    if (Number.isFinite(current) && current > 0) continue;

    const suggestion = ItemPriceMemoryService.getBestPrice(server, material.itemId, { includeNpc: false });
    if (!suggestion) continue;

    next[key] = suggestion.value;
    changed = true;
  }

  if (changed) {
    ImbuementMarketService.savePrices(server, next);
  }

  return changed ? next : prices;
}

function getMaterialPriceSuggestions(imbuement: ImbuementRecord, server: VaultServer | null) {
  if (!server) return {};

  return imbuement.materials.reduce<Record<string, ItemPriceMemorySuggestion>>((acc, material) => {
    if (!material.itemId) return acc;

    const suggestion = ItemPriceMemoryService.getBestPrice(server, material.itemId, { includeNpc: false });
    if (!suggestion) return acc;

    acc[ImbuementMarketService.getMaterialPriceKey(material)] = suggestion;
    return acc;
  }, {});
}

function rememberImbuementMaterialPrices(
  imbuement: ImbuementRecord,
  prices: ImbuementMarketPriceMap,
  server: VaultServer,
  context: string
) {
  for (const material of imbuement.materials) {
    const key = ImbuementMarketService.getMaterialPriceKey(material);
    const price = prices[key];
    if (Number.isFinite(price) && price > 0) {
      rememberMaterialPrice(material, price, server, context);
    }
  }
}

function rememberMaterialPrice(
  material: ImbuementRecord["materials"][number],
  value: number,
  server: VaultServer | null,
  context: string
) {
  if (!server || !material.itemId || !Number.isFinite(value) || value <= 0) return;

  ItemPriceMemoryService.rememberPrice({
    server,
    itemId: material.itemId,
    itemName: material.resolvedName || material.itemName,
    source: "imbuement-market",
    value,
    context: `Imbuement Database - ${context}`
  });
}
