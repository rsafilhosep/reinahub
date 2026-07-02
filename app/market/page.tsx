"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import { ActiveServerBanner } from "@/components/ActiveServerBanner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Tabs } from "@/components/Tabs";
import { integer, money } from "@/services/format";
import { getActiveServer, goldToPremium, premiumToBrl } from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import type { MarketAnalysis, VaultServer } from "@/types/vault";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type MarketItemSearchResult = {
  id: number;
  name: string;
  npcPrice: number | null;
  image: {
    path: string;
    exists: boolean;
  };
};

const MISSING_ITEM_IMAGE = "/assets/icons/missing-item.svg";

export default function MarketPage() {
  const [tab, setTab] = useState("analise");
  const [server, setServer] = useState<VaultServer | null>(null);
  const [nome, setNome] = useState("Green Dragon Leather");
  const [selectedItem, setSelectedItem] = useState<MarketItemSearchResult | null>(null);
  const [itemResults, setItemResults] = useState<MarketItemSearchResult[]>([]);
  const [itemSearchLoading, setItemSearchLoading] = useState(false);
  const [qtd, setQtd] = useState(100);
  const [npcUnit, setNpcUnit] = useState(100);
  const [marketUnit, setMarketUnit] = useState(130);
  const [taxa, setTaxa] = useState(5);
  const [history, setHistory] = useState<MarketAnalysis[]>([]);

  useEffect(() => {
    const sync = () => setServer(getActiveServer());
    sync();
    setHistory(StorageService.get<MarketAnalysis[]>("ma_history", []));
    window.addEventListener("reinahub:quote-change", sync);
    return () => window.removeEventListener("reinahub:quote-change", sync);
  }, []);

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
        const response = await fetch(`/api/items?query=${encodeURIComponent(query)}`);
        const data = (await response.json()) as { results?: MarketItemSearchResult[] };
        if (!cancelled) setItemResults(data.results ?? []);
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
  }, [nome]);

  const analysis = useMemo<MarketAnalysis>(() => {
    const npcTotal = qtd * npcUnit;
    const marketBruto = qtd * marketUnit;
    const taxaValor = marketBruto * (taxa / 100);
    const marketLiquido = marketBruto - taxaValor;
    const diffAbs = marketLiquido - npcTotal;
    const diffPct = npcTotal > 0 ? (diffAbs / npcTotal) * 100 : 0;
    return {
      itemId: selectedItem?.id ?? null,
      itemImagePath: selectedItem?.image.path ?? null,
      nome,
      qtd,
      npcUnit,
      marketUnit,
      taxaPct: taxa,
      npcTotal,
      marketBruto,
      taxaValor,
      marketLiquido,
      diffAbs,
      diffPct,
      ts: Date.now()
    };
  }, [nome, qtd, npcUnit, marketUnit, taxa, selectedItem]);

  const bestGp = Math.max(analysis.npcTotal, analysis.marketLiquido);
  const premium = server ? goldToPremium(server, bestGp) : 0;
  const brl = server ? premiumToBrl(server, premium, "venda") : 0;

  function saveAnalysis() {
    const next = [...history, { ...analysis, ts: Date.now() }].slice(-50);
    setHistory(next);
    StorageService.set("ma_history", next);
  }

  function updateItemName(value: string) {
    setNome(value);
    if (selectedItem && value.trim().toLowerCase() !== selectedItem.name.toLowerCase()) {
      setSelectedItem(null);
    }
  }

  function selectMarketItem(item: MarketItemSearchResult) {
    setSelectedItem(item);
    setNome(item.name);
    if (item.npcPrice !== null) setNpcUnit(item.npcPrice);
    setItemResults([]);
  }

  return (
    <AppShell current="market" mark="MA" subtitle="Market Analyzer - NPC vs Market">
      <ActiveServerBanner />
      <Tabs active={tab} onChange={setTab} tabs={[
        { key: "analise", label: "I - Analise" },
        { key: "historico", label: "II - Historico" },
        { key: "ranking", label: "III - Ranking" }
      ]} />

      {tab === "analise" ? (
        <>
          <Panel title="Parametros do item" eyebrow="npc vs market">
            <div className="inputs-grid">
              <Field label="Nome do item">
                <input value={nome} onChange={(e) => updateItemName(e.target.value)} />
              </Field>
              <Field label="Quantidade"><input type="number" value={qtd} onChange={(e) => setQtd(Number(e.target.value))} /></Field>
              <Field label="Valor unitario NPC"><div className="field-wrap"><span className="field-suffix">gp</span><input className="with-suffix" type="number" value={npcUnit} onChange={(e) => setNpcUnit(Number(e.target.value))} /></div></Field>
              <Field label="Valor unitario Market"><div className="field-wrap"><span className="field-suffix">gp</span><input className="with-suffix" type="number" value={marketUnit} onChange={(e) => setMarketUnit(Number(e.target.value))} /></div></Field>
              <Field label="Taxa do Market"><div className="field-wrap"><span className="field-suffix">%</span><input className="with-suffix" type="number" step="0.1" value={taxa} onChange={(e) => setTaxa(Number(e.target.value))} /></div></Field>
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
                  #{selectedItem.id}{selectedItem.npcPrice !== null ? ` - NPC ${integer(selectedItem.npcPrice)} gp` : " - sem preco NPC"}
                </span>
              </div>
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
                    <span style={{ color: "var(--gold)" }}>{item.npcPrice !== null ? `${integer(item.npcPrice)} gp NPC` : `#${item.id}`}</span>
                  </button>
                ))}
              </div>
            ) : null}
            {!selectedItem && itemSearchLoading ? <div className="note" style={{ marginTop: 12 }}>Buscando na base local...</div> : null}
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={saveAnalysis}>Salvar analise</button>
            </div>
          </Panel>

          <div className="verdict">
            <div className="label">Melhor opcao</div>
            <div className={`value ${analysis.diffAbs >= 0 ? "" : "red"}`}>{analysis.diffAbs >= 0 ? "Vender no Market" : "Vender para NPC"}</div>
            <div className="note">{analysis.diffAbs >= 0 ? "+" : ""}{integer(analysis.diffAbs)} gp ({money(analysis.diffPct, 2)}%)</div>
          </div>

          <div className="slots">
            <ResultSlot label="NPC total" value={`${integer(analysis.npcTotal)} gp`} tone="red" />
            <ResultSlot label="Market bruto" value={`${integer(analysis.marketBruto)} gp`} />
            <ResultSlot label="Taxa descontada" value={`${integer(analysis.taxaValor)} gp`} tone="small" />
            <ResultSlot label="Market liquido" value={`${integer(analysis.marketLiquido)} gp`} />
            <ResultSlot label="Equivalencia ativa" value={`${money(premium, 4)} ${server?.moeda ?? ""}`} tone="gold" />
            <ResultSlot label="Estimativa em reais" value={`R$ ${money(brl, 2)}`} />
          </div>

          <Panel title="Comparacao" eyebrow="npc vs market liquido">
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
        <Panel title="Historico de analises" eyebrow="salvo localmente">
          <button className="quick-btn danger" type="button" onClick={() => { setHistory([]); StorageService.remove("ma_history"); }}>Limpar historico</button>
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
                <span style={{ color: "var(--gold)" }}>{integer(entry.diffAbs)} gp</span>
              </div>
            )) : <div className="empty-msg">Nenhuma analise salva ainda.</div>}
          </div>
        </Panel>
      ) : null}

      {tab === "ranking" ? (
        <Panel title="Ranking de economia" eyebrow="maiores diferencas">
          <div className="rank-list">
            {history.length ? history.slice().sort((a, b) => Math.abs(b.diffAbs) - Math.abs(a.diffAbs)).slice(0, 10).map((entry, index) => (
              <div className="rank-item" key={`${entry.ts}-${index}`}><strong style={{ color: "var(--gold)" }}>{index + 1}</strong><span>{entry.nome}</span><span>{integer(entry.diffAbs)} gp</span></div>
            )) : <div className="empty-msg">Salve analises para ver o ranking.</div>}
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
