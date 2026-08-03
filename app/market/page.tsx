"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Tabs } from "@/components/Tabs";
import { integer, money } from "@/services/format";
import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { ItemPriceMemoryService, type ItemPriceMemorySuggestion } from "@/source/web/src/reina-core/prices";
import { ItemSearchClientService } from "@/source/web/src/features/item-database/services/item-search-client-service";
import type { ItemSearchResult } from "@/source/web/src/features/item-database/types";
import { MarketEconomyService } from "@/source/web/src/features/market-analyzer/services/market-economy-service";
import type { MarketAnalysis, VaultServer } from "@/types/vault";
import { cleanupLegacyHistoriesOnce } from "@/services/release-cleanup-service";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const ITEM_CATEGORY_FILTERS = [
  { key: "", label: "Todos" },
  { key: "weapon", label: "Weapons" },
  { key: "potion", label: "Potions" },
  { key: "tool", label: "Tools" },
  { key: "helmet", label: "Helmets" },
  { key: "armor", label: "Armors" },
  { key: "legs", label: "Legs" },
  { key: "shield", label: "Shields" },
  { key: "creature-product", label: "Creature Products" },
  { key: "currency", label: "Currency" },
  { key: "rune", label: "Runes" }
];

export default function MarketPage() {
  const [tab, setTab] = useState("analise");
  const [server, setServer] = useState<VaultServer | null>(null);
  const [nome, setNome] = useState("Green Dragon Leather");
  const [itemCategory, setItemCategory] = useState("");
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null);
  const [itemResults, setItemResults] = useState<ItemSearchResult[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [qtd, setQtd] = useState(100);
  const [npcUnit, setNpcUnit] = useState(100);
  const [marketUnit, setMarketUnit] = useState(130);
  const [taxa, setTaxa] = useState(5);
  const [marketMinProfitPct, setMarketMinProfitPct] = useState(5);
  const [marketMinProfitGp, setMarketMinProfitGp] = useState(0);
  const [history, setHistory] = useState<MarketAnalysis[]>([]);
  const [priceSuggestion, setPriceSuggestion] = useState<ItemPriceMemorySuggestion | null>(null);

  useEffect(() => {
    cleanupLegacyHistoriesOnce();
    const sync = () => setServer(ReinaEconomyService.getActiveContext().server);
    sync();
    setHistory(MarketEconomyService.loadHistory());
    return ReinaEconomyService.subscribe(sync);
  }, []);

  useEffect(() => {
    if (!selectedItem) {
      setPriceSuggestion(null);
      return;
    }
    const suggestion = ItemPriceMemoryService.getBestPrice(server, selectedItem.id, { includeNpc: false });
    setPriceSuggestion(suggestion);
  }, [selectedItem, server]);

  useEffect(() => {
    const query = nome.trim();
    if (query.length < 2) {
      setItemResults([]);
      setItemSearchLoading(false);
      return;
    }

    let cancelled = false;
    setItemSearchLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        const results = await ItemSearchClientService.searchItems({ query, category: itemCategory });
        if (!cancelled) setItemResults(results);
      } catch {
        if (!cancelled) setItemResults([]);
      } finally {
        if (!cancelled) setItemSearchLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [nome, itemCategory]);

  const economy = useMemo(() => (
    MarketEconomyService.summarize({
      itemId: selectedItem?.id ?? null,
      itemImagePath: selectedItem?.image.path ?? null,
      nome,
      qtd,
      npcUnit,
      marketUnit,
      taxaPct: taxa,
      marketMinProfitPct,
      marketMinProfitGp
    }, server)
  ), [nome, qtd, npcUnit, marketUnit, taxa, marketMinProfitPct, marketMinProfitGp, selectedItem, server]);
  const analysis = economy.analysis;
  const premium = economy.premium;
  const brl = economy.brl;

  function saveAnalysis() {
    const next = MarketEconomyService.saveAnalysis(history, analysis);
    if (analysis.itemId) {
      ItemPriceMemoryService.rememberPrice({
        server,
        itemId: analysis.itemId,
        itemName: analysis.nome,
        source: "npc",
        value: analysis.npcUnit,
        context: "Market Analyzer"
      });
      ItemPriceMemoryService.rememberPrice({
        server,
        itemId: analysis.itemId,
        itemName: analysis.nome,
        source: "market-manual",
        value: analysis.marketUnit,
        context: "Market Analyzer"
      });
      ItemPriceMemoryService.rememberPrice({
        server,
        itemId: analysis.itemId,
        itemName: analysis.nome,
        source: "last-analysis",
        value: analysis.marketUnit,
        context: "Market Analyzer"
      });
    }
    setHistory(next);
  }

  function updateItemName(value: string) {
    setNome(value);
    if (selectedItem && value.trim().toLowerCase() !== selectedItem.name.toLowerCase()) {
      setSelectedItem(null);
      setPriceSuggestion(null);
    }
  }

  function selectMarketItem(item: ItemSearchResult) {
    setSelectedItem(item);
    setNome(item.name);
    if (item.npcPrice !== null) setNpcUnit(item.npcPrice);
    const suggestion = ItemPriceMemoryService.getBestPrice(server, item.id, { includeNpc: false });
    setPriceSuggestion(suggestion);
    if (suggestion) setMarketUnit(suggestion.value);
    setItemResults([]);
  }

  function updateItemCategory(category: string) {
    setItemCategory(category);
    setItemResults([]);
    if (selectedItem && category && !itemMatchesCategory(selectedItem, category)) {
      setSelectedItem(null);
      setPriceSuggestion(null);
    }
  }

  return (
    <AppShell current="market" mark="MA" subtitle="Market Analyzer - NPC vs Market">
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: "analise", label: "I - Análise" },
        { key: "historico", label: "II - Histórico" },
        { key: "ranking", label: "III - Ranking" }
      ]} />

      {tab === "analise" ? (
        <>
          <Panel title="Parâmetros do item" eyebrow="npc vs market">
            <div className="quick-row" style={{ marginTop: 0, marginBottom: 14 }}>
              {ITEM_CATEGORY_FILTERS.map((filter) => (
                <button
                  className={`quick-btn ${itemCategory === filter.key ? "primary" : ""}`}
                  key={filter.key || "all"}
                  type="button"
                  onClick={() => updateItemCategory(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <div className="inputs-grid">
              <Field label="Nome do item">
                <input value={nome} onChange={(e) => updateItemName(e.target.value)} />
              </Field>
              <Field label="Quantidade"><input type="number" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></Field>
              <Field label="Valor unitário NPC"><div className="field-wrap"><span className="field-suffix">gp</span><input className="with-suffix" type="number" value={npcUnit} onChange={(e) => setNpcUnit(Number(e.target.value))} /></div></Field>
              <Field label="Valor unitário Market"><div className="field-wrap"><span className="field-suffix">gp</span><input className="with-suffix" type="number" value={marketUnit} onChange={(e) => setMarketUnit(Number(e.target.value))} /></div></Field>
              <Field label="Taxa do Market"><div className="field-wrap"><span className="field-suffix">%</span><input className="with-suffix" type="number" step="0.1" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} /></div></Field>
              <Field label="Vantagem mínima Market">
                <div className="field-wrap">
                  <span className="field-suffix">%</span>
                  <input className="with-suffix" type="number" min="0" step="0.1" value={marketMinProfitPct} onChange={(e) => setMarketMinProfitPct(Number(e.target.value))} />
                </div>
              </Field>
              <Field label="Ganho mínimo Market">
                <div className="field-wrap">
                  <span className="field-suffix">gp</span>
                  <input className="with-suffix" type="number" min="0" value={marketMinProfitGp} onChange={(e) => setMarketMinProfitGp(Number(e.target.value))} />
                </div>
              </Field>
            </div>
            {selectedItem ? (
              <div className="history-item" style={{ marginTop: 14 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  <img
                    src={selectedItem.image.path}
                    alt=""
                    width={28}
                    height={28}
                    onError={(event) => {
                      event.currentTarget.src = MISSING_ITEM_IMAGE;
                    }}
                    style={{ width: 28, height: 28, imageRendering: "pixelated", objectFit: "contain" }}
                  />
                  {selectedItem.name}
                </span>
                <span style={{ color: "var(--gold)" }}>
                  {formatItemMeta(selectedItem)}
                </span>
              </div>
            ) : null}
            {selectedItem && priceSuggestion ? (
              <p className="note">
                Preço sugerido para Market: {integer(priceSuggestion.value)} gp via {priceSuggestion.label}.
              </p>
            ) : null}
            {!selectedItem && itemResults.length ? (
              <div className="history-list" style={{ marginTop: 14 }}>
                {itemResults.slice(0, 8).map((item) => (
                  <button
                    className="history-item"
                    key={item.id}
                    type="button"
                    onClick={() => selectMarketItem(item)}
                    style={{ width: "100%", cursor: "pointer", textAlign: "left" }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <img
                        src={item.image.path}
                        alt=""
                        width={28}
                        height={28}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.src = MISSING_ITEM_IMAGE;
                        }}
                        style={{ width: 28, height: 28, imageRendering: "pixelated", objectFit: "contain" }}
                      />
                      {item.name}
                    </span>
                    <span style={{ color: "var(--gold)" }}>{formatItemMeta(item)}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {!selectedItem && itemSearchLoading ? <div className="note" style={{ marginTop: 12 }}>Buscando na base local...</div> : null}
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={saveAnalysis}>Salvar análise</button>
            </div>
          </Panel>

          <div className="verdict">
            <div className="label">Melhor opção</div>
            <div className={`value ${economy.bestOption === "market" ? "" : "red"}`}>{economy.bestOption === "market" ? "Vender no Market" : "Vender para NPC"}</div>
            <div className="note">
              {analysis.diffAbs >= 0 ? "+" : ""}{integer(analysis.diffAbs)} gp ({money(analysis.diffPct, 2)}%) - {analysis.recommendationReason}
            </div>
          </div>

          <div className="slots">
            <ResultSlot label="NPC total" value={`${integer(analysis.npcTotal)} gp`} tone="red" />
            <ResultSlot label="Market bruto" value={`${integer(analysis.marketBruto)} gp`} />
            <ResultSlot label="Taxa descontada" value={`${integer(analysis.taxaValor)} gp`} tone="small" />
            <ResultSlot label="Market líquido" value={`${integer(analysis.marketLiquido)} gp`} />
            <ResultSlot label="Equivalência ativa" value={`${money(premium, 4)} ${server?.moeda ?? ""}`} tone="gold" />
            <ResultSlot label="Estimativa em reais" value={`R$ ${money(brl, 2)}`} />
          </div>

          <Panel title="Comparação" eyebrow="npc vs market líquido">
            <div className="chart-wrap">
              <Bar
                data={{
                  labels: ["NPC", "Market"],
                  datasets: [{ data: [analysis.npcTotal, analysis.marketLiquido], backgroundColor: ["#c0463f", "#1f8a7a"], borderRadius: 6 }]
                }}
                options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
              />
            </div>
          </Panel>
        </>
      ) : null}

      {tab === "historico" ? (
        <Panel title="Histórico de análises" eyebrow="salvo localmente">
          <button className="quick-btn danger" type="button" onClick={() => { setHistory([]); MarketEconomyService.clearHistory(); }}>Limpar histórico</button>
          <div className="history-list" style={{ marginTop: 16 }}>
            {history.length ? history.slice().reverse().map((entry) => (
              <div className="history-item" key={entry.ts}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                  {entry.itemImagePath ? (
                    <img
                      src={entry.itemImagePath}
                      alt=""
                      width={24}
                      height={24}
                      onError={(event) => {
                        event.currentTarget.src = MISSING_ITEM_IMAGE;
                      }}
                      style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain" }}
                    />
                  ) : null}
                  {new Date(entry.ts).toLocaleString("pt-BR")} - {entry.nome} ({entry.qtd}x)
                </span>
                <span style={{ color: "var(--gold)" }}>{formatMarketRecommendation(entry)} - {integer(entry.diffAbs)} gp</span>
              </div>
            )) : <div className="empty-msg">Nenhuma análise salva ainda.</div>}
          </div>
        </Panel>
      ) : null}

      {tab === "ranking" ? (
        <Panel title="Ranking de economia" eyebrow="maiores diferenças">
          <div className="rank-list">
            {history.length ? history.slice().sort((a, b) => Math.abs(b.diffAbs) - Math.abs(a.diffAbs)).slice(0, 10).map((entry, index) => (
              <div className="rank-item" key={`${entry.ts}-${index}`}><strong style={{ color: "var(--gold)" }}>{index + 1}</strong><span>{entry.nome}</span><span>{formatMarketRecommendation(entry)} - {integer(entry.diffAbs)} gp</span></div>
            )) : <div className="empty-msg">Salve análises para ver o ranking.</div>}
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

function itemMatchesCategory(item: ItemSearchResult, category: string) {
  return item.category === category || item.slot === category || item.weaponType === category;
}

function formatItemCategory(item: ItemSearchResult) {
  return item.slot ?? item.weaponType ?? item.category;
}

function formatItemMeta(item: ItemSearchResult) {
  const price = item.npcPrice !== null ? `${integer(item.npcPrice)} gp NPC` : `#${item.id}`;
  return `${price} - ${formatItemCategory(item)}`;
}

function formatMarketRecommendation(entry: MarketAnalysis) {
  if (entry.recommendedOption) return entry.recommendedOption === "market" ? "Market" : "NPC";
  return entry.diffAbs > 0 ? "Market" : "NPC";
}
