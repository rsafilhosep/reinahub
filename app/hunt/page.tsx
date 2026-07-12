"use client";

import { Download, Eye, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import html2canvas from "html2canvas";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { MonsterAvatar } from "@/components/GameAvatar";
import { Panel } from "@/components/Panel";
import { integer, money } from "@/services/format";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { HuntEconomyService } from "@/source/web/src/features/hunt-analyzer/services/hunt-economy-service";
import { HuntHistoryService, type HuntHistoryPeriod, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import { ImbuementMarketService, type HuntImbuementMarketSummary, type ImbuementMarketPriceMap } from "@/source/web/src/features/imbuement-database/services/imbuement-market-service";
import type { HuntSummary } from "@/services/hunt-service";
import type { HuntSession, VaultServer } from "@/types/vault";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type HuntTextScalarField = Exclude<keyof HuntSession, "KilledMonsters" | "LootedItems">;

export default function HuntPage() {
  const [server, setServer] = useState<VaultServer | null>(null);
  const [imbuementMarketPrices, setImbuementMarketPrices] = useState<ImbuementMarketPriceMap>({});
  const [summary, setSummary] = useState<HuntSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [mode, setMode] = useState("import");
  const [innerTab, setInnerTab] = useState("kills");
  const [history, setHistory] = useState<HuntHistoryRecord[]>([]);
  const [historyItemQuery, setHistoryItemQuery] = useState("");
  const [historyMonsterQuery, setHistoryMonsterQuery] = useState("");
  const [preview, setPreview] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      const activeServer = ReinaEconomyService.getActiveContext().server;
      setServer(activeServer);
      setImbuementMarketPrices(ImbuementMarketService.loadPrices(activeServer));
      setHistory(HuntHistoryService.loadForActiveContext());
    };
    sync();
    return ReinaActiveContextService.subscribe(sync);
  }, []);

  const economy = useMemo(
    () => HuntEconomyService.summarize(summary, server, imbuementMarketPrices),
    [summary, server, imbuementMarketPrices]
  );
  const imbuementMarketSummary = economy.imbuementMarket;
  const premium = economy.balancePremium;
  const brl = economy.balanceBrl;
  const imbuementPremium = economy.imbuementMarket.premium;
  const imbuementBrl = economy.imbuementMarket.brl;


  async function handleFile(file: File) {
    await handleFiles([file]);
  }

  async function handleFiles(files: File[] | FileList) {
    const selectedFiles = Array.from(files);
    if (!selectedFiles.length) return;

    setImportError("");
    setImportMessage(`Processando ${selectedFiles.length} arquivo(s)...`);

    const imported: Array<{ summary: HuntSummary; sourceName: string }> = [];
    const failed: string[] = [];

    for (const file of selectedFiles) {
      try {
        const text = await file.text();
        const hunt = parseHuntImportText(text);
        const nextSummary = await summarizeHuntSession(hunt);
        imported.push({ summary: nextSummary, sourceName: file.name });
      } catch {
        failed.push(file.name);
      }
    }

    if (!imported.length) {
      setImportMessage("");
      setImportError("Nao foi possivel importar nenhum arquivo selecionado.");
      return;
    }

    if (imported.length === 1) {
      const [{ summary: nextSummary, sourceName }] = imported;
      setSummary(nextSummary);
      setFileName(sourceName);
      setHistory(HuntHistoryService.add(nextSummary, sourceName, server));
      setInnerTab("kills");
      setPreview(false);
    } else {
      setSummary(null);
      setFileName("");
      setHistory(HuntHistoryService.addMany(imported, server));
      setMode("history");
    }

    setImportMessage(
      `${imported.length} hunt(s) importada(s).${failed.length ? ` Falharam: ${failed.join(", ")}.` : ""}`
    );
  }

  async function handlePastedText() {
    const text = pastedText.trim();
    if (!text) {
      setImportError("Cole o texto da hunt antes de processar.");
      return;
    }

    try {
      const hunt = parseHuntImportText(text);
      await processHuntSession(hunt, "texto colado");
      setPastedText("");
      setImportError("");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Nao foi possivel ler o texto da hunt.");
    }
  }

  async function processHuntSession(hunt: HuntSession, sourceName: string) {
    setImportError("");
    const nextSummary = await summarizeHuntSession(hunt);
    setSummary(nextSummary);
    setFileName(sourceName);
    setHistory(HuntHistoryService.add(nextSummary, sourceName, server));
    setInnerTab("kills");
    setPreview(false);
  }

  async function summarizeHuntSession(hunt: HuntSession) {
    const response = await fetch("/api/hunt/summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hunt)
    });

    if (!response.ok) {
      throw new Error("Nao foi possivel processar a hunt.");
    }

    return (await response.json()) as HuntSummary;
  }

  function openHistoryRecord(record: HuntHistoryRecord) {
    setSummary(record.summary);
    setFileName(record.sourceName);
    setPreview(false);
    setInnerTab("kills");
  }

  function removeHistoryRecord(id: string) {
    setHistory(HuntHistoryService.remove(id));
  }

  async function exportPng() {
    const card = getExportCardElement();
    if (!card) return;
    const canvas = await renderExportCanvas(card);
    const link = document.createElement("a");
    link.download = createHuntExportName("png");
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportPdf() {
    const card = getExportCardElement();
    if (!card) return;
    const pdf = await renderExportPdf(card);
    pdf.save(createHuntExportName("pdf"));
  }

  async function sharePng() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("");
    const canvas = await renderExportCanvas(card);
    const blob = await canvasToBlob(canvas, "image/png");
    const fileName = createHuntExportName("png");
    const file = new File([blob], fileName, { type: "image/png" });
    const shared = await shareExportFile(file, "ReinaHub Hunt Report", "Resumo de hunt gerado no ReinaHub.");
    setExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador nao suporta compartilhar este arquivo; PNG baixado.");
    if (!shared) downloadBlob(blob, fileName);
  }

  async function sharePdf() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("");
    const pdf = await renderExportPdf(card);
    const blob = pdf.output("blob");
    const fileName = createHuntExportName("pdf");
    const file = new File([blob], fileName, { type: "application/pdf" });
    const shared = await shareExportFile(file, "ReinaHub Hunt Report", "Resumo de hunt gerado no ReinaHub.");
    setExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador nao suporta compartilhar este arquivo; PDF baixado.");
    if (!shared) downloadBlob(blob, fileName);
  }

  function generateExportCard() {
    setPreview(true);
    setExportMessage("Imagem gerada. Agora voce pode baixar ou compartilhar.");
  }

  function getExportCardElement() {
    if (preview && cardRef.current) return cardRef.current;
    setExportMessage("Precisa gerar a imagem antes de baixar ou compartilhar.");
    return null;
  }

  return (
    <AppShell current="hunt" mark="HA" subtitle="Hunt Analyzer - loot - exportacao">
      {!summary ? (
        <>
          <div className="tabs">
            {[
              { key: "import", label: "I - Importar" },
              { key: "history", label: `II - Historico (${history.length})` }
            ].map((tab) => (
              <button className={`tab-btn${mode === tab.key ? " active" : ""}`} key={tab.key} type="button" onClick={() => setMode(tab.key)}>{tab.label}</button>
            ))}
          </div>

          {mode === "import" ? (
            <>
              <div className="dropzone">
                <input
                  type="file"
                  accept=".json,.txt"
                  multiple
                  onChange={(e) => e.target.files?.length && handleFiles(e.target.files).catch((error) => {
                    setImportError(error instanceof Error ? error.message : "Nao foi possivel importar o arquivo.");
                  })}
                />
                <div style={{ fontSize: 42, marginBottom: 14 }}>HA</div>
                <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: 1 }}>Importar Sessao de Hunt</h2>
                <p className="note">Arraste ou selecione um ou varios JSON/TXT exportados da hunt.</p>
              </div>
              {importMessage ? <div className="note" style={{ marginBottom: 14, color: "var(--teal-glow)" }}>{importMessage}</div> : null}

              <Panel title="Colar texto da hunt" eyebrow="session analyzer">
                <div className="field-group">
                  <label>Texto copiado do jogo</label>
                  <textarea
                    value={pastedText}
                    onChange={(event) => setPastedText(event.target.value)}
                    placeholder={"Session data: From 2026-07-02, 05:15:26 to 2026-07-02, 05:18:25\nSession: 00:02h\nRaw XP Gain: 24.785\n...\nKilled Monsters:\n\t9x Blood Beast\nLooted Items:\n\t1597x gold coin"}
                    rows={12}
                  />
                </div>
                {importError ? <div className="note" style={{ color: "var(--crimson-glow)" }}>{importError}</div> : null}
                <div className="quick-row">
                  <button className="quick-btn primary" type="button" onClick={handlePastedText}>Processar texto</button>
                  <button className="quick-btn" type="button" onClick={() => { setPastedText(""); setImportError(""); }}>Limpar</button>
                </div>
              </Panel>
            </>
          ) : (
            <HuntHistoryPanel
              history={history}
              itemQuery={historyItemQuery}
              monsterQuery={historyMonsterQuery}
              server={server}
              onItemQueryChange={setHistoryItemQuery}
              onMonsterQueryChange={setHistoryMonsterQuery}
              onOpen={openHistoryRecord}
              onRemove={removeHistoryRecord}
              onClear={() => setHistory(HuntHistoryService.clear())}
            />
          )}
        </>
      ) : (
        <>
          <Panel title="Sessao de Hunt" eyebrow={fileName || summary.sessionLength}>
            <div className="hero-grid">
              <Hero label="Balance" value={`${integer(summary.balance)} gp`} sub={`Loot ${integer(summary.lootValue)} (${lootSourceLabel(summary)}) - Suprimentos ${integer(summary.supplies)}`} tone="gold" />
              <Hero label="XP ganho" value={integer(summary.xpGain)} sub={`${integer(summary.xpHour)} XP/h`} />
              <Hero label="Monstros mortos" value={integer(summary.totalKills)} sub={`${summary.kills.length} especies`} />
              <Hero label="Dano total" value={integer(summary.damage)} sub={`${integer(summary.damageHour)} dano/h`} />
              <Hero label="Duracao" value={summary.sessionLength} sub={summary.sessionStart.split(",")[0] ?? ""} />
              <Hero label="Itens lootados" value={`${summary.loot.length} tipos`} sub={`Cura ${integer(summary.healing)}`} />
              <Hero label="Materiais imbue" value={`${summary.imbuementSummary.totalMaterialTypes} tipos`} sub={`${integer(summary.imbuementSummary.totalMaterialCount)} itens`} />
              <Hero label="Valor imbue" value={`${integer(imbuementMarketSummary.totalMarketValue)} gp`} sub={`${imbuementMarketSummary.pricedTypes}/${summary.imbuementSummary.totalMaterialTypes} com preco`} tone="gold" />
            </div>
          </Panel>

          {server ? (
            <div className="conv-strip" style={{ display: "flex", gap: 22, flexWrap: "wrap", alignItems: "center" }}>
              <div><div className="label">Balance</div><div className="value gold">{integer(summary.balance)} gp</div></div>
              <div className="value">=</div>
              <div><div className="label">Em {server.moeda}</div><div className="value gold">{money(premium, 4)}</div></div>
              <div><div className="label">Em reais</div><div className="value">R$ {money(brl, 2)}</div></div>
              <div className="note">via {ReinaEconomyService.getDisplayName(server)}</div>
            </div>
          ) : null}

          <Panel title="Detalhes da hunt" eyebrow="monstros - loot - grafico">
            <div className="tabs">
              {[
                "kills",
                "loot",
                "imbuements",
                "chart",
                ...(summary.unmatchedLootItems.length ? [`debug (${summary.unmatchedLootItems.length})`] : [])
              ].map((key) => (
                <button className={`tab-btn${innerTab === key ? " active" : ""}`} key={key} type="button" onClick={() => setInnerTab(key)}>{key}</button>
              ))}
            </div>
            {innerTab === "kills" ? (
              <List
                rows={summary.kills.map((kill) => ({
                  name: kill.Name,
                  value: `${integer(kill.Count)}x`,
                  href: `/monsters?monster=${encodeURIComponent(kill.Name)}`
                }))}
                avatar="monster"
              />
            ) : null}
            {innerTab === "loot" ? (
              <List
                rows={summary.loot.map((item) => ({
                  name: item.Name,
                  value: `${integer(item.Count)}x`,
                  imagePath: item.imagePath,
                  href: item.itemId ? `/items?itemId=${item.itemId}` : undefined
                }))}
                avatar="item"
              />
            ) : null}
            {innerTab === "imbuements" ? (
              <ImbuementLootPanel
                summary={summary}
                marketPrices={imbuementMarketPrices}
                marketSummary={imbuementMarketSummary}
                premium={imbuementPremium}
                brl={imbuementBrl}
                server={server}
              />
            ) : null}
            {innerTab === "chart" ? (
              <div className="chart-wrap">
                <Bar
                  data={{
                    labels: summary.kills.slice(0, 10).map((kill) => kill.Name),
                    datasets: [{ data: summary.kills.slice(0, 10).map((kill) => kill.Count), backgroundColor: "#1f8a7a", borderRadius: 6 }]
                  }}
                  options={{ indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }}
                />
              </div>
            ) : null}
            {innerTab.startsWith("debug") ? <UnmatchedLootPanel items={summary.unmatchedLootItems} sourceName={fileName} /> : null}
          </Panel>

          <Panel title="Exportar card" eyebrow="PNG / PDF">
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={generateExportCard}><Eye size={15} /> Gerar imagem</button>
              <button className="quick-btn" type="button" onClick={exportPng}><Download size={15} /> Baixar PNG</button>
              <button className="quick-btn" type="button" onClick={exportPdf}><Download size={15} /> Baixar PDF</button>
              <button className="quick-btn" type="button" onClick={sharePng}><Share2 size={15} /> Compartilhar PNG</button>
              <button className="quick-btn" type="button" onClick={sharePdf}><Share2 size={15} /> Compartilhar PDF</button>
              <button className="quick-btn danger" type="button" onClick={() => { setSummary(null); setMode("import"); }}><RotateCcw size={15} /> Nova hunt</button>
            </div>
            {exportMessage ? <div className="note" style={{ marginTop: 12 }}>{exportMessage}</div> : null}
            <div style={{ display: preview ? "flex" : "none", justifyContent: "center", marginTop: 22, overflow: "auto" }}>
              <ExportCard refEl={cardRef} summary={summary} server={server} premium={premium} brl={brl} />
            </div>
          </Panel>
        </>
      )}
    </AppShell>
  );
}

async function renderExportCanvas(element: HTMLElement) {
  return html2canvas(element, { scale: 2, backgroundColor: "#0d0a06", useCORS: true });
}

async function renderExportPdf(element: HTMLElement) {
  const [{ jsPDF }, canvas] = await Promise.all([
    import("jspdf"),
    renderExportCanvas(element)
  ]);
  const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [canvas.width / 2, canvas.height / 2] });
  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, canvas.width / 2, canvas.height / 2);
  return pdf;
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Nao foi possivel gerar o arquivo."));
    }, type);
  });
}

async function shareExportFile(file: File, title: string, text: string) {
  if (!navigator.share) return false;

  const payload = { files: [file], title, text };
  if (navigator.canShare && !navigator.canShare(payload)) return false;

  try {
    await navigator.share(payload);
    return true;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return true;
    return false;
  }
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

function createHuntExportName(extension: "png" | "pdf") {
  return `hunt-report-${Date.now()}.${extension}`;
}

function createHuntHistoryExportName(extension: "png" | "pdf") {
  return `hunt-history-report-${Date.now()}.${extension}`;
}

function HuntHistoryPanel({
  history,
  itemQuery,
  monsterQuery,
  server,
  onItemQueryChange,
  onMonsterQueryChange,
  onOpen,
  onRemove,
  onClear
}: {
  history: HuntHistoryRecord[];
  itemQuery: string;
  monsterQuery: string;
  server: VaultServer | null;
  onItemQueryChange: (query: string) => void;
  onMonsterQueryChange: (query: string) => void;
  onOpen: (record: HuntHistoryRecord) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  const [baseId, setBaseId] = useState(history[1]?.id ?? history[0]?.id ?? "");
  const [compareId, setCompareId] = useState(history[0]?.id ?? "");
  const [compareItemQuery, setCompareItemQuery] = useState("");
  const [compareMonsterQuery, setCompareMonsterQuery] = useState("");
  const [period, setPeriod] = useState<HuntHistoryPeriod>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [historyPreview, setHistoryPreview] = useState(false);
  const [historyExportMessage, setHistoryExportMessage] = useState("");
  const historyCardRef = useRef<HTMLDivElement>(null);
  const filteredHistory = useMemo(
    () => HuntHistoryService.filterByPeriod(history, period, customStart, customEnd),
    [history, period, customStart, customEnd]
  );
  const totals = useMemo(() => HuntHistoryService.summarize(filteredHistory), [filteredHistory]);
  const totalPremium = useMemo(() => ReinaEconomyService.goldToPremium(server, totals.totalBalance), [server, totals.totalBalance]);
  const totalBrlVenda = useMemo(() => ReinaEconomyService.premiumToBrl(server, totalPremium, "venda"), [server, totalPremium]);
  const totalBrlCompra = useMemo(() => ReinaEconomyService.premiumToBrl(server, totalPremium, "compra"), [server, totalPremium]);
  const lootPremium = useMemo(() => ReinaEconomyService.goldToPremium(server, totals.totalLootValue), [server, totals.totalLootValue]);
  const suppliesPremium = useMemo(() => ReinaEconomyService.goldToPremium(server, totals.totalSupplies), [server, totals.totalSupplies]);
  const itemStats = useMemo(() => HuntHistoryService.getItemStats(filteredHistory, itemQuery), [filteredHistory, itemQuery]);
  const monsterStats = useMemo(() => HuntHistoryService.getMonsterStats(filteredHistory, monsterQuery), [filteredHistory, monsterQuery]);
  const baseRecord = filteredHistory.find((record) => record.id === baseId) ?? filteredHistory[1] ?? filteredHistory[0] ?? null;
  const compareRecord = filteredHistory.find((record) => record.id === compareId) ?? filteredHistory[0] ?? null;
  const comparison = baseRecord && compareRecord && baseRecord.id !== compareRecord.id
    ? HuntHistoryService.compare(baseRecord, compareRecord)
    : null;
  const itemComparison = comparison ? HuntHistoryService.compareItem(comparison.base, comparison.compare, compareItemQuery) : null;
  const monsterComparison = comparison ? HuntHistoryService.compareMonster(comparison.base, comparison.compare, compareMonsterQuery) : null;
  const chartRecords = useMemo(
    () => filteredHistory.slice().sort((a, b) => a.createdAt - b.createdAt).slice(-20),
    [filteredHistory]
  );
  const chartLabels = chartRecords.map((record) => new Date(record.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
  const cumulativeBalance = useMemo(() => getCumulativeValues(chartRecords.map((record) => record.summary.balance)), [chartRecords]);
  const cumulativeXp = useMemo(() => getCumulativeValues(chartRecords.map((record) => record.summary.xpGain)), [chartRecords]);

  function generateHistoryExportCard() {
    if (!filteredHistory.length) {
      setHistoryExportMessage("Nao ha hunts no periodo filtrado para gerar o card.");
      return;
    }
    setHistoryPreview(true);
    setHistoryExportMessage("Resumo gerado. Agora voce pode baixar ou compartilhar.");
  }

  function getHistoryExportCardElement() {
    if (historyPreview && historyCardRef.current) return historyCardRef.current;
    setHistoryExportMessage("Precisa gerar o resumo antes de baixar ou compartilhar.");
    return null;
  }

  async function exportHistoryPng() {
    const card = getHistoryExportCardElement();
    if (!card) return;
    const canvas = await renderExportCanvas(card);
    const link = document.createElement("a");
    link.download = createHuntHistoryExportName("png");
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportHistoryPdf() {
    const card = getHistoryExportCardElement();
    if (!card) return;
    const pdf = await renderExportPdf(card);
    pdf.save(createHuntHistoryExportName("pdf"));
  }

  async function shareHistoryPng() {
    const card = getHistoryExportCardElement();
    if (!card) return;
    setHistoryExportMessage("");
    const canvas = await renderExportCanvas(card);
    const blob = await canvasToBlob(canvas, "image/png");
    const fileName = createHuntHistoryExportName("png");
    const file = new File([blob], fileName, { type: "image/png" });
    const shared = await shareExportFile(file, "ReinaHub Hunt History", "Resumo de hunts gerado no ReinaHub.");
    setHistoryExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador nao suporta compartilhar este arquivo; PNG baixado.");
    if (!shared) downloadBlob(blob, fileName);
  }

  if (!history.length) {
    return (
      <Panel title="Historico de hunts" eyebrow="salvo localmente">
        <div className="empty-msg">Nenhuma hunt salva ainda. Ao processar uma hunt, ela entra aqui automaticamente.</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel title="Resumo do historico" eyebrow="comparativo geral">
        <PeriodFilter
          period={period}
          customStart={customStart}
          customEnd={customEnd}
          filteredCount={filteredHistory.length}
          totalCount={history.length}
          onPeriodChange={setPeriod}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
        <div className="hero-grid">
          <Hero label="Hunts salvas" value={integer(totals.huntCount)} sub="ate 200 sessoes locais" />
          <Hero label="Balance total" value={`${integer(totals.totalBalance)} gp`} sub={`Loot ${integer(totals.totalLootValue)}`} tone="gold" />
          <Hero label={server ? `Balance em ${server.moeda}` : "Balance em moeda"} value={server ? money(totalPremium, 4) : "-"} sub={server ? ReinaEconomyService.getDisplayName(server) : "configure a cotacao"} tone="gold" />
          <Hero label="Balance em R$" value={server ? `R$ ${money(totalBrlVenda, 2)}` : "-"} sub={server ? `compra R$ ${money(totalBrlCompra, 2)}` : "configure a cotacao"} />
          <Hero label="XP total" value={integer(totals.totalXpGain)} sub={`${integer(totals.averageXpHour)} XP/h medio`} />
          <Hero label="Kills totais" value={integer(totals.totalKills)} sub={`Supplies ${integer(totals.totalSupplies)} gp`} />
          <Hero label={server ? `Loot em ${server.moeda}` : "Loot em moeda"} value={server ? money(lootPremium, 4) : "-"} sub={`${integer(totals.totalLootValue)} gp`} />
          <Hero label={server ? `Supplies em ${server.moeda}` : "Supplies em moeda"} value={server ? money(suppliesPremium, 4) : "-"} sub={`${integer(totals.totalSupplies)} gp`} />
        </div>
      </Panel>

      <CollapsiblePanel
        title="Exportar resumo"
        eyebrow="PNG / PDF"
        summary="Gere um card consolidado do periodo filtrado para baixar ou compartilhar."
      >
        <div className="quick-row">
          <button className="quick-btn primary" type="button" onClick={generateHistoryExportCard}><Eye size={15} /> Gerar resumo</button>
          <button className="quick-btn" type="button" onClick={exportHistoryPng}><Download size={15} /> Baixar PNG</button>
          <button className="quick-btn" type="button" onClick={exportHistoryPdf}><Download size={15} /> Baixar PDF</button>
          <button className="quick-btn" type="button" onClick={shareHistoryPng}><Share2 size={15} /> Compartilhar PNG</button>
        </div>
        {historyExportMessage ? <div className="note" style={{ marginTop: 12 }}>{historyExportMessage}</div> : null}
        <div style={{ display: historyPreview ? "flex" : "none", justifyContent: "center", marginTop: 22, overflow: "auto" }}>
          <HistoryExportCard
            refEl={historyCardRef}
            records={filteredHistory}
            totals={totals}
            server={server}
            totalPremium={totalPremium}
            totalBrlVenda={totalBrlVenda}
            itemStats={itemStats}
            monsterStats={monsterStats}
            periodLabel={getHistoryPeriodLabel(period, customStart, customEnd)}
          />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Hunts salvas"
        eyebrow="abrir - comparar - limpar"
        defaultOpen={filteredHistory.length <= 6}
        summary={`${integer(filteredHistory.length)} hunt(s) no periodo filtrado. Abra uma sessao apenas quando precisar revisar detalhes.`}
      >
        <div className="quick-row" style={{ marginTop: 0 }}>
          <button className="quick-btn danger" type="button" onClick={onClear}>Limpar historico</button>
        </div>
        <div className="history-list" style={{ marginTop: 14 }}>
          {filteredHistory.map((record) => (
            <div className="history-item" key={record.id}>
              <span>
                {new Date(record.createdAt).toLocaleString("pt-BR")}
                <span className="note" style={{ marginLeft: 10 }}>
                  {getHuntHistoryContextLabel(record)} - {record.summary.sessionLength}
                </span>
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: "var(--gold)" }}>{integer(record.summary.balance)} gp</span>
                <button className="quick-btn" type="button" onClick={() => onOpen(record)}>Abrir</button>
                <button className="quick-btn danger" type="button" onClick={() => onRemove(record.id)}>Remover</button>
              </span>
            </div>
          ))}
          {!filteredHistory.length ? <div className="empty-msg">Nenhuma hunt encontrada para este periodo.</div> : null}
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Comparar hunts"
        eyebrow="base vs comparada"
        summary={filteredHistory.length >= 2 ? "Compare duas sessoes e veja diferenca de balance, XP, loot e monstros." : "Salve pelo menos duas hunts para comparar."}
      >
        {filteredHistory.length >= 2 ? (
          <>
            <div className="inputs-grid" style={{ marginBottom: 16 }}>
              <div className="field-group">
                <label>Hunt base</label>
                <select value={baseRecord?.id ?? ""} onChange={(event) => setBaseId(event.target.value)}>
                  {filteredHistory.map((record) => (
                    <option value={record.id} key={record.id}>
                      {formatHuntHistoryOption(record)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field-group">
                <label>Hunt comparada</label>
                <select value={compareRecord?.id ?? ""} onChange={(event) => setCompareId(event.target.value)}>
                  {filteredHistory.map((record) => (
                    <option value={record.id} key={record.id}>
                      {formatHuntHistoryOption(record)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {comparison ? (
              <>
                <div className="history-list">
                  {comparison.metrics.map((metric) => (
                    <div className="history-item" key={metric.label}>
                      <span>
                        {metric.label}
                        <span className="note" style={{ marginLeft: 10 }}>
                          {integer(metric.baseValue)} {"->"} {integer(metric.compareValue)} {metric.unit}
                        </span>
                      </span>
                      <span style={{ color: metric.diff >= 0 ? "var(--teal-glow)" : "var(--crimson-glow)" }}>
                        {metric.diff >= 0 ? "+" : ""}{integer(metric.diff)} {metric.unit}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="hunt-history-entity-compare">
                  <div>
                    <div className="field-group" style={{ marginBottom: 12 }}>
                      <label>Comparar item especifico</label>
                      <input value={compareItemQuery} onChange={(event) => setCompareItemQuery(event.target.value)} placeholder="Ex: gold coin, platinum coin..." />
                    </div>
                    <EntityComparisonCard comparison={itemComparison} valueLabel="Valor NPC" valueUnit="gp" emptyText="Digite um item para comparar." />
                  </div>

                  <div>
                    <div className="field-group" style={{ marginBottom: 12 }}>
                      <label>Comparar monstro especifico</label>
                      <input value={compareMonsterQuery} onChange={(event) => setCompareMonsterQuery(event.target.value)} placeholder="Ex: dragon, blood beast..." />
                    </div>
                    <EntityComparisonCard comparison={monsterComparison} emptyText="Digite um monstro para comparar." />
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-msg">Escolha duas hunts diferentes para comparar.</div>
            )}
          </>
        ) : (
          <div className="empty-msg">Salve pelo menos duas hunts para comparar.</div>
        )}
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Graficos do historico"
        eyebrow="evolucao das ultimas 20 hunts"
        defaultOpen
        summary="Veja a evolucao de balance e XP das sessoes mais recentes."
      >
        <div className="hunt-history-chart-grid">
          <HistoryChart
            title="Balance por hunt"
            labels={chartLabels}
            values={chartRecords.map((record) => record.summary.balance)}
            color="#e8c468"
          />
          <HistoryChart
            title="XP/h por hunt"
            labels={chartLabels}
            values={chartRecords.map((record) => record.summary.xpHour)}
            color="#35c9b2"
          />
          <HistoryChart
            title="Balance acumulado"
            labels={chartLabels}
            values={cumulativeBalance}
            color="#c0463f"
          />
          <HistoryChart
            title="XP acumulado"
            labels={chartLabels}
            values={cumulativeXp}
            color="#1f8a7a"
          />
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Itens e monstros recorrentes"
        eyebrow="ranking local"
        summary="Ranking local de drops e criaturas encontrados nas hunts filtradas."
      >
        <div className="hunt-history-rank-grid">
          <div>
            <div className="field-group" style={{ marginBottom: 14 }}>
              <label>Filtrar item</label>
              <input value={itemQuery} onChange={(event) => onItemQueryChange(event.target.value)} placeholder="Ex: gold coin, minotaur horn..." />
            </div>
            <div className="history-list">
              {itemStats.slice(0, 20).map((item) => (
                <div className="history-item" key={item.name}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <img
                      src={item.imagePath || MISSING_ITEM_IMAGE}
                      alt=""
                      width={24}
                      height={24}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = MISSING_ITEM_IMAGE;
                      }}
                      style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
                    />
                    {item.name}
                    <span className="note">{item.huntCount} hunt(s)</span>
                  </span>
                  <span style={{ color: "var(--gold)" }}>
                    {integer(item.count)}x
                    {item.totalSellValue ? <span className="note" style={{ marginLeft: 10 }}>{integer(item.totalSellValue)} gp NPC</span> : null}
                  </span>
                </div>
              ))}
              {!itemStats.length ? <div className="empty-msg">Nenhum item encontrado para o filtro.</div> : null}
            </div>
          </div>

          <div>
            <div className="field-group" style={{ marginBottom: 14 }}>
              <label>Filtrar monstro</label>
              <input value={monsterQuery} onChange={(event) => onMonsterQueryChange(event.target.value)} placeholder="Ex: dragon, rat, minotaur..." />
            </div>
            <div className="history-list">
              {monsterStats.slice(0, 20).map((monster) => (
                <div className="history-item" key={monster.name}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <MonsterAvatar name={monster.name} size={28} />
                    {monster.name}
                    <span className="note">{monster.huntCount} hunt(s)</span>
                  </span>
                  <span style={{ color: "var(--gold)" }}>{integer(monster.count)}x</span>
                </div>
              ))}
              {!monsterStats.length ? <div className="empty-msg">Nenhum monstro encontrado para o filtro.</div> : null}
            </div>
          </div>
        </div>
      </CollapsiblePanel>
    </>
  );
}

function EntityComparisonCard({
  comparison,
  valueLabel,
  valueUnit,
  emptyText
}: {
  comparison: ReturnType<typeof HuntHistoryService.compareItem> | ReturnType<typeof HuntHistoryService.compareMonster>;
  valueLabel?: string;
  valueUnit?: string;
  emptyText: string;
}) {
  if (!comparison) return <div className="empty-msg">{emptyText}</div>;

  return (
    <div className="market-card">
      <div className="label">{comparison.name}</div>
      <div className="history-item" style={{ marginBottom: 8 }}>
        <span>Quantidade</span>
        <span style={{ color: comparison.diff >= 0 ? "var(--teal-glow)" : "var(--crimson-glow)" }}>
          {integer(comparison.baseCount)} {"->"} {integer(comparison.compareCount)} ({comparison.diff >= 0 ? "+" : ""}{integer(comparison.diff)})
        </span>
      </div>
      {valueLabel ? (
        <div className="history-item">
          <span>{valueLabel}</span>
          <span style={{ color: comparison.valueDiff >= 0 ? "var(--teal-glow)" : "var(--crimson-glow)" }}>
            {integer(comparison.baseValue)} {"->"} {integer(comparison.compareValue)} {valueUnit ?? ""}
          </span>
        </div>
      ) : null}
    </div>
  );
}

function PeriodFilter({
  period,
  customStart,
  customEnd,
  filteredCount,
  totalCount,
  onPeriodChange,
  onCustomStartChange,
  onCustomEndChange
}: {
  period: HuntHistoryPeriod;
  customStart: string;
  customEnd: string;
  filteredCount: number;
  totalCount: number;
  onPeriodChange: (period: HuntHistoryPeriod) => void;
  onCustomStartChange: (value: string) => void;
  onCustomEndChange: (value: string) => void;
}) {
  const options: Array<{ key: HuntHistoryPeriod; label: string }> = [
    { key: "all", label: "Tudo" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
    { key: "custom", label: "Periodo" }
  ];

  return (
    <div className="hunt-period-filter">
      <div className="quick-row" style={{ marginTop: 0 }}>
        {options.map((option) => (
          <button
            className={`quick-btn ${period === option.key ? "primary" : ""}`}
            key={option.key}
            type="button"
            onClick={() => onPeriodChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="hunt-period-dates">
          <div className="field-group">
            <label>Inicio</label>
            <input type="date" value={customStart} onChange={(event) => onCustomStartChange(event.target.value)} />
          </div>
          <div className="field-group">
            <label>Fim</label>
            <input type="date" value={customEnd} onChange={(event) => onCustomEndChange(event.target.value)} />
          </div>
        </div>
      ) : null}
      <div className="note">{filteredCount} de {totalCount} hunt(s) no periodo selecionado.</div>
    </div>
  );
}

function HistoryChart({ title, labels, values, color }: { title: string; labels: string[]; values: number[]; color: string }) {
  return (
    <div>
      <div className="label">{title}</div>
      <div className="chart-wrap compact">
        <Bar
          data={{
            labels,
            datasets: [{ data: values, backgroundColor: color, borderRadius: 6 }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { color: "#8c93a3" }, grid: { color: "#242a38" } },
              y: { ticks: { color: "#8c93a3" }, grid: { color: "#242a38" } }
            }
          }}
        />
      </div>
    </div>
  );
}

function getCumulativeValues(values: number[]) {
  let runningTotal = 0;
  return values.map((value) => {
    runningTotal += Number(value) || 0;
    return runningTotal;
  });
}

function formatHuntHistoryOption(record: HuntHistoryRecord) {
  const date = new Date(record.createdAt).toLocaleDateString("pt-BR");
  return `${date} - ${integer(record.summary.balance)} gp - ${record.summary.sessionLength}`;
}

function ImbuementLootPanel({
  summary,
  marketPrices,
  marketSummary,
  premium,
  brl,
  server
}: {
  summary: HuntSummary;
  marketPrices: ImbuementMarketPriceMap;
  marketSummary: HuntImbuementMarketSummary;
  premium: number;
  brl: number;
  server: VaultServer | null;
}) {
  if (!summary.imbuementLootItems.length) {
    return <div className="empty-msg">Nenhum material de imbuement encontrado nesta hunt.</div>;
  }

  return (
    <div>
      <div className="hero-grid" style={{ marginBottom: 16 }}>
        <Hero label="Materiais encontrados" value={`${summary.imbuementSummary.totalMaterialTypes} tipos`} sub={`${integer(summary.imbuementSummary.totalMaterialCount)} itens lootados`} />
        <Hero label="Imbuements relacionados" value={`${summary.imbuementSummary.relatedImbuements.length}`} sub="basic / intricate / powerful" />
        <Hero label="Valor Market salvo" value={`${integer(marketSummary.totalMarketValue)} gp`} sub={`${marketSummary.pricedTypes}/${summary.imbuementSummary.totalMaterialTypes} materiais com preco`} tone="gold" />
        <Hero label={server ? `Em ${server.moeda}` : "Moeda premium"} value={server ? money(premium, 4) : "-"} sub={server ? `R$ ${money(brl, 2)}` : "configure a cotacao"} />
      </div>

      {summary.imbuementSummary.relatedImbuements.length > 0 ? (
        <div className="history-list" style={{ marginBottom: 16 }}>
          {summary.imbuementSummary.relatedImbuements.slice(0, 8).map((imbuement) => (
            <div className="history-item" key={imbuement.imbuementId}>
              <span>
                <Link href={`/imbuements?imbuement=${encodeURIComponent(imbuement.imbuementId)}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {imbuement.imbuementName}
                </Link>
                <span className="note" style={{ marginLeft: 10 }}>{imbuement.group}</span>
              </span>
              <span style={{ color: "var(--gold)" }}>
                {imbuement.materialTypesInHunt} mat. / {integer(imbuement.totalLootedMaterialCount)}x
              </span>
            </div>
          ))}
        </div>
      ) : null}

      <div className="history-list">
        {summary.imbuementLootItems.map((item) => {
          const unitPrice = marketPrices[ImbuementMarketService.getMaterialPriceKey(item)];
          const hasPrice = Number.isFinite(unitPrice) && unitPrice > 0;
          const totalValue = hasPrice ? unitPrice * (Number(item.Count) || 0) : 0;

          return (
            <div className="history-item" key={`${item.Name}-${item.Count}`}>
              <LinkedHuntEntity
                avatar="item"
                href={item.itemId ? `/items?itemId=${item.itemId}` : undefined}
                imagePath={item.imagePath}
                name={item.Name}
                subtitle={item.imbuementUsages.slice(0, 2).map((usage) => usage.group).join(", ")}
              />
              <span style={{ color: "var(--gold)" }}>
                {integer(item.Count)}x
                <span className="note" style={{ marginLeft: 10 }}>
                  {hasPrice ? `${integer(totalValue)} gp` : "sem preco"}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseHuntImportText(text: string): HuntSession {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Arquivo ou texto vazio.");

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as HuntSession;
  }

  const lines = trimmed.split(/\r?\n/);
  const session: HuntSession = {
    KilledMonsters: [],
    LootedItems: []
  };
  let section: "kills" | "loot" | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    if (lower.startsWith("killed monsters")) {
      section = "kills";
      continue;
    }
    if (lower.startsWith("looted items")) {
      section = "loot";
      continue;
    }

    const quantityMatch = line.match(/^(\d+)x\s+(.+)$/i);
    if (quantityMatch && section === "kills") {
      session.KilledMonsters?.push({ Count: Number(quantityMatch[1]), Name: quantityMatch[2].trim() });
      continue;
    }
    if (quantityMatch && section === "loot") {
      session.LootedItems?.push({ Count: Number(quantityMatch[1]), Name: quantityMatch[2].trim() });
      continue;
    }

    const keyValue = line.match(/^([^:]+):\s*(.*)$/);
    if (!keyValue) continue;

    const key = keyValue[1].trim().toLowerCase();
    const value = keyValue[2].trim();

    if (key === "session data") {
      const range = value.match(/^from\s+(.+?)\s+to\s+(.+)$/i);
      session.SessionStart = range?.[1]?.trim() ?? value;
      session.SessionEnd = range?.[2]?.trim() ?? "";
      continue;
    }

    const field = HUNT_TEXT_FIELD_MAP[key];
    if (field) {
      session[field] = value;
    }
  }

  if (!session.KilledMonsters?.length && !session.LootedItems?.length) {
    throw new Error("Nao encontrei monstros mortos nem itens lootados no texto.");
  }

  return session;
}

const HUNT_TEXT_FIELD_MAP: Record<string, HuntTextScalarField> = {
  session: "SessionLength",
  "raw xp gain": "RawXPGain",
  "xp gain": "XPGain",
  "xp/h": "XPGainHour",
  "raw xp/h": "RawXPGainHour",
  loot: "Loot",
  supplies: "Supplies",
  balance: "Balance",
  damage: "Damage",
  "damage/h": "DamageHour",
  healing: "Healing",
  "healing/h": "HealingHour"
};

function Hero({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gold" }) {
  return <div className="hero-card"><div className="label">{label}</div><div className={`value ${tone ?? ""}`}>{value}</div><div className="note">{sub}</div></div>;
}

function UnmatchedLootPanel({
  items,
  sourceName
}: {
  items: HuntSummary["unmatchedLootItems"];
  sourceName: string;
}) {
  if (!items.length) {
    return <div className="empty-msg">Todos os itens da hunt foram encontrados na base local.</div>;
  }

  function downloadReviewFile() {
    const payload = {
      generatedAt: new Date().toISOString(),
      sourceName,
      totalUnmatchedItems: items.length,
      items: items.map((item) => ({
        name: item.Name,
        normalizedName: item.normalizedName,
        count: Number(item.Count) || 0,
        suggestedAction: "review-manual-mapping"
      }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reinahub-unmatched-loot-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="note" style={{ marginBottom: 12 }}>
        Estes itens foram lidos da hunt, mas ainda nao casaram com `items.json`. Use esta lista para revisar aliases,
        nomes antigos ou itens ausentes na base local.
      </div>
      <div className="quick-row" style={{ marginTop: 0, marginBottom: 12 }}>
        <button className="quick-btn" type="button" onClick={downloadReviewFile}>Baixar JSON de revisao</button>
      </div>
      <div className="history-list">
        {items.map((item) => (
          <div className="history-item" key={`${item.Name}-${item.Count}-${item.normalizedName}`}>
            <span>
              {item.Name}
              <span className="note" style={{ marginLeft: 10 }}>normalizado: {item.normalizedName}</span>
            </span>
            <span style={{ color: "var(--gold)" }}>{integer(item.Count)}x</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function List({
  rows,
  avatar
}: {
  rows: Array<{ name: string; value: string; imagePath?: string; href?: string }>;
  avatar?: "monster" | "item";
}) {
  return (
    <div className="history-list">
      {rows.map(({ name, value, imagePath, href }) => (
        <div className="history-item" key={name}>
          <LinkedHuntEntity avatar={avatar} href={href} imagePath={imagePath} name={name} />
          <span style={{ color: "var(--gold)" }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

function LinkedHuntEntity({
  avatar,
  href,
  imagePath,
  name,
  subtitle
}: {
  avatar?: "monster" | "item";
  href?: string;
  imagePath?: string;
  name: string;
  subtitle?: string;
}) {
  const content = (
    <>
      {avatar === "monster" ? <MonsterAvatar name={name} size={32} /> : null}
      {avatar === "item" ? (
        <img
          src={imagePath || MISSING_ITEM_IMAGE}
          alt=""
          width={24}
          height={24}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = MISSING_ITEM_IMAGE;
          }}
          style={{ width: 24, height: 24, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
        />
      ) : null}
      <span>
        <span>{name}</span>
        {subtitle ? <span className="note" style={{ display: "inline", marginLeft: 10 }}>{subtitle}</span> : null}
      </span>
    </>
  );

  if (!href) {
    return <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>{content}</span>;
  }

  return (
    <Link href={href} style={{ color: "inherit", display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
      {content}
    </Link>
  );
}

function ExportCard({
  refEl,
  summary,
  server,
  premium,
  brl
}: {
  refEl: React.RefObject<HTMLDivElement>;
  summary: HuntSummary;
  server: VaultServer | null;
  premium: number;
  brl: number;
}) {
  const topKills = summary.kills.slice(0, 6);
  const topLoot = summary.loot.slice(0, 8);
  const topImbuementLoot = summary.imbuementLootItems.slice(0, 5);
  const sessionDate = summary.sessionStart || summary.sessionLength || new Date().toLocaleDateString("pt-BR");
  const serverName = ReinaEconomyService.getDisplayName(server);
  const profitTone = summary.balance >= 0 ? "#35c9b2" : "#ef6a62";

  return (
    <div
      ref={refEl}
      style={{
        width: 820,
        background:
          "radial-gradient(circle at 12% 0%, rgba(53,201,178,.14), transparent 34%), radial-gradient(circle at 88% 100%, rgba(192,70,63,.13), transparent 36%), linear-gradient(180deg, #151923 0%, #0b0d12 100%)",
        border: "2px solid #c8922a",
        borderRadius: 18,
        color: "#e9ecf2",
        padding: 28,
        fontFamily: "Inter, Arial, sans-serif",
        boxShadow: "0 0 48px rgba(200,146,42,.22)",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 22, borderBottom: "1px solid #3a2a10", paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 54, height: 54, border: "2px solid #a98a45", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5c842", fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 900, background: "#1e2330" }}>
            RH
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 28, letterSpacing: 1.2, color: "#f5c842", fontWeight: 800 }}>ReinaHub</div>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: "#8c93a3", textTransform: "uppercase", marginTop: 4 }}>Hunt Analyzer Report</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#35c9b2", fontWeight: 800 }}>{serverName}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 6 }}>{sessionDate}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 4 }}>{summary.sessionLength}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ border: "1px solid #c8922a", borderRadius: 14, background: "linear-gradient(160deg, #1e2330, #171b24)", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8 }}>Balance da sessao</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, color: profitTone, fontWeight: 800, lineHeight: 1.1 }}>{integer(summary.balance)} gp</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "#8c93a3" }}>
            <span>Loot {integer(summary.lootValue)} gp</span>
            <span>Supplies {integer(summary.supplies)} gp</span>
            {server ? <span style={{ color: "#f5c842" }}>{money(premium, 4)} {server.moeda}</span> : null}
            {server ? <span style={{ color: "#35c9b2" }}>R$ {money(brl, 2)}</span> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #2a3040", borderRadius: 14, background: "#11151d", padding: 18 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 }}>Resumo rapido</div>
          <ExportMiniRow label="Duracao" value={summary.sessionLength} />
          <ExportMiniRow label="XP/h" value={integer(summary.xpHour)} />
          <ExportMiniRow label="Kills" value={integer(summary.totalKills)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
        <ExportMetric label="XP ganho" value={integer(summary.xpGain)} sub={`${integer(summary.xpHour)} XP/h`} />
        <ExportMetric label="Kills" value={integer(summary.totalKills)} sub={`${summary.kills.length} especies`} />
        <ExportMetric label="Loot" value={`${integer(summary.lootValue)} gp`} sub={`${summary.loot.length} tipos`} />
        <ExportMetric label="Supplies" value={`${integer(summary.supplies)} gp`} sub="custo informado" />
        <ExportMetric label="Damage" value={integer(summary.damage)} sub={`${integer(summary.damageHour)} /h`} />
        <ExportMetric label="Healing" value={integer(summary.healing)} sub="cura total" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ExportSection title="Top monstros">
          {topKills.map((kill) => (
            <ExportRow
              key={kill.Name}
              imagePath={getMonsterImagePath(kill.Name)}
              fallbackImage={MISSING_CREATURE_IMAGE}
              label={kill.Name}
              value={`${integer(kill.Count)}x`}
            />
          ))}
        </ExportSection>

        <ExportSection title="Top loot">
          {topLoot.map((item) => (
            <ExportRow
              key={item.Name}
              imagePath={item.imagePath}
              label={item.Name}
              sub={item.totalSellValue ? `${integer(item.totalSellValue)} gp NPC` : undefined}
              value={`${integer(item.Count)}x`}
            />
          ))}
          {!topLoot.length ? <ExportEmpty /> : null}
        </ExportSection>
      </div>

      {topImbuementLoot.length ? (
        <div style={{ marginTop: 14 }}>
          <ExportSection title="Materiais de imbuement">
            {topImbuementLoot.map((item) => (
              <ExportRow
                key={item.Name}
                imagePath={item.imagePath}
                label={item.Name}
                sub={item.imbuementUsages.slice(0, 2).map((usage) => usage.group).join(", ")}
                value={`${integer(item.Count)}x`}
              />
            ))}
          </ExportSection>
        </div>
      ) : null}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, borderTop: "1px solid #2a3040", marginTop: 18, paddingTop: 12, fontSize: 10, color: "#5b6175" }}>
        <span>Valores ilustrativos. Confirme as cotacoes atuais antes de negociar.</span>
        <span>Generated by ReinaHub</span>
      </div>
    </div>
  );
}

function ExportMetric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ background: "#1e2330", border: "1px solid #2a3040", borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10, color: "#8c93a3", letterSpacing: 1.3, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 17, color: "#35c9b2", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 10, color: "#5b6175", marginTop: 6 }}>{sub}</div>
    </div>
  );
}

function ExportMiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #242a38", padding: "7px 0", fontSize: 12 }}>
      <span style={{ color: "#8c93a3" }}>{label}</span>
      <span style={{ color: "#e9ecf2", fontFamily: "JetBrains Mono, monospace", fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function ExportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#171b24", border: "1px solid #2a3040", borderRadius: 12, padding: 14 }}>
      <div style={{ fontFamily: "Cinzel, serif", fontSize: 13, color: "#e8c468", letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function ExportRow({
  fallbackImage = MISSING_ITEM_IMAGE,
  imagePath,
  label,
  sub,
  value
}: {
  fallbackImage?: string;
  imagePath?: string;
  label: string;
  sub?: string;
  value: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid #242a38", padding: "7px 0", fontSize: 12, alignItems: "center" }}>
      <span style={{ color: "#c6ccd8", display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        {imagePath ? (
          <img
            src={imagePath}
            alt=""
            width={22}
            height={22}
            onError={(event) => {
              if (event.currentTarget.src.endsWith(fallbackImage)) return;
              event.currentTarget.src = fallbackImage;
            }}
            style={{ width: 22, height: 22, imageRendering: "pixelated", objectFit: "contain", flexShrink: 0 }}
          />
        ) : null}
        <span style={{ minWidth: 0 }}>
          <span>{label}</span>
          {sub ? <span style={{ display: "block", color: "#5b6175", fontSize: 10, marginTop: 2 }}>{sub}</span> : null}
        </span>
      </span>
      <span style={{ color: "#f5c842", fontFamily: "JetBrains Mono, monospace", flexShrink: 0 }}>{value}</span>
    </div>
  );
}

function ExportEmpty() {
  return <div style={{ color: "#5b6175", fontSize: 12, padding: "8px 0" }}>Sem dados.</div>;
}

function HistoryExportCard({
  refEl,
  records,
  totals,
  server,
  totalPremium,
  totalBrlVenda,
  itemStats,
  monsterStats,
  periodLabel
}: {
  refEl: React.RefObject<HTMLDivElement>;
  records: HuntHistoryRecord[];
  totals: ReturnType<typeof HuntHistoryService.summarize>;
  server: VaultServer | null;
  totalPremium: number;
  totalBrlVenda: number;
  itemStats: ReturnType<typeof HuntHistoryService.getItemStats>;
  monsterStats: ReturnType<typeof HuntHistoryService.getMonsterStats>;
  periodLabel: string;
}) {
  const firstDate = records.length ? new Date(Math.min(...records.map((record) => record.createdAt))).toLocaleDateString("pt-BR") : "-";
  const lastDate = records.length ? new Date(Math.max(...records.map((record) => record.createdAt))).toLocaleDateString("pt-BR") : "-";
  const serverName = ReinaEconomyService.getDisplayName(server);
  const profitTone = totals.totalBalance >= 0 ? "#35c9b2" : "#ef6a62";

  return (
    <div
      ref={refEl}
      style={{
        width: 920,
        background:
          "radial-gradient(circle at 12% 0%, rgba(53,201,178,.14), transparent 34%), radial-gradient(circle at 88% 100%, rgba(192,70,63,.13), transparent 36%), linear-gradient(180deg, #151923 0%, #0b0d12 100%)",
        border: "2px solid #c8922a",
        borderRadius: 18,
        color: "#e9ecf2",
        padding: 28,
        fontFamily: "Inter, Arial, sans-serif",
        boxShadow: "0 0 48px rgba(200,146,42,.22)",
        overflow: "hidden"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 22, borderBottom: "1px solid #3a2a10", paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 54, height: 54, border: "2px solid #a98a45", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#f5c842", fontFamily: "Cinzel, serif", fontSize: 20, fontWeight: 900, background: "#1e2330" }}>
            RH
          </div>
          <div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: 28, letterSpacing: 1.2, color: "#f5c842", fontWeight: 800 }}>ReinaHub</div>
            <div style={{ fontSize: 11, letterSpacing: 2.4, color: "#8c93a3", textTransform: "uppercase", marginTop: 4 }}>Hunt History Report</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#35c9b2", fontWeight: 800 }}>{serverName}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 6 }}>{periodLabel}</div>
          <div style={{ fontSize: 11, color: "#8c93a3", marginTop: 4 }}>{firstDate} - {lastDate}</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 14, marginBottom: 16 }}>
        <div style={{ border: "1px solid #c8922a", borderRadius: 14, background: "linear-gradient(160deg, #1e2330, #171b24)", padding: 20 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 8 }}>Balance acumulado</div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 36, color: profitTone, fontWeight: 800, lineHeight: 1.1 }}>{integer(totals.totalBalance)} gp</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12, fontSize: 12, color: "#8c93a3" }}>
            <span>Loot {integer(totals.totalLootValue)} gp</span>
            <span>Supplies {integer(totals.totalSupplies)} gp</span>
            {server ? <span style={{ color: "#f5c842" }}>{money(totalPremium, 4)} {server.moeda}</span> : null}
            {server ? <span style={{ color: "#35c9b2" }}>R$ {money(totalBrlVenda, 2)}</span> : null}
          </div>
        </div>

        <div style={{ border: "1px solid #2a3040", borderRadius: 14, background: "#11151d", padding: 18 }}>
          <div style={{ fontSize: 11, color: "#8c93a3", letterSpacing: 1.8, textTransform: "uppercase", marginBottom: 10 }}>Resumo rapido</div>
          <ExportMiniRow label="Hunts" value={integer(totals.huntCount)} />
          <ExportMiniRow label="XP total" value={integer(totals.totalXpGain)} />
          <ExportMiniRow label="XP/h medio" value={integer(totals.averageXpHour)} />
          <ExportMiniRow label="Kills" value={integer(totals.totalKills)} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 18 }}>
        <ExportMetric label="Hunts salvas" value={integer(totals.huntCount)} sub="no periodo" />
        <ExportMetric label="Loot total" value={`${integer(totals.totalLootValue)} gp`} sub={server ? `${money(ReinaEconomyService.goldToPremium(server, totals.totalLootValue), 4)} ${server.moeda}` : "moeda nao configurada"} />
        <ExportMetric label="Supplies" value={`${integer(totals.totalSupplies)} gp`} sub={server ? `${money(ReinaEconomyService.goldToPremium(server, totals.totalSupplies), 4)} ${server.moeda}` : "moeda nao configurada"} />
        <ExportMetric label="Em reais" value={server ? `R$ ${money(totalBrlVenda, 2)}` : "-"} sub="valor venda estimado" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <ExportSection title="Top monstros">
          {monsterStats.slice(0, 8).map((monster) => (
            <ExportRow
              key={monster.name}
              imagePath={getMonsterImagePath(monster.name)}
              fallbackImage={MISSING_CREATURE_IMAGE}
              label={monster.name}
              sub={`${monster.huntCount} hunt(s)`}
              value={`${integer(monster.count)}x`}
            />
          ))}
          {!monsterStats.length ? <ExportEmpty /> : null}
        </ExportSection>

        <ExportSection title="Top loot">
          {itemStats.slice(0, 8).map((item) => (
            <ExportRow
              key={item.name}
              imagePath={item.imagePath ?? undefined}
              label={item.name}
              sub={item.totalSellValue ? `${integer(item.totalSellValue)} gp NPC` : `${item.huntCount} hunt(s)`}
              value={`${integer(item.count)}x`}
            />
          ))}
          {!itemStats.length ? <ExportEmpty /> : null}
        </ExportSection>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, borderTop: "1px solid #2a3040", marginTop: 18, paddingTop: 12, fontSize: 10, color: "#5b6175" }}>
        <span>Valores ilustrativos. Confirme as cotacoes atuais antes de negociar.</span>
        <span>Generated by ReinaHub</span>
      </div>
    </div>
  );
}

function getHistoryPeriodLabel(period: HuntHistoryPeriod, customStart: string, customEnd: string) {
  if (period === "7d") return "Ultimos 7 dias";
  if (period === "30d") return "Ultimos 30 dias";
  if (period === "custom") return `${customStart || "inicio"} - ${customEnd || "hoje"}`;
  return "Todo o historico";
}

function getHuntHistoryContextLabel(record: HuntHistoryRecord) {
  return record.characterName || record.profileName || record.serverName || "sem contexto";
}

function lootSourceLabel(summary: { lootValueSource?: string; lootCoverage?: number }) {
  if (summary.lootValueSource === "database") {
    return `base ReinaHub - ${Math.round((summary.lootCoverage ?? 0) * 100)}% dos tipos precificados`;
  }
  if (summary.lootValueSource === "game") return "valor do jogo";
  return "valor do jogo";
}
