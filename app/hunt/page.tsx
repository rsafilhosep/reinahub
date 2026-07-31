"use client";

import { Download, Eye, Film, Loader2, RotateCcw, Share2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { MonsterAvatar } from "@/components/GameAvatar";
import { Panel } from "@/components/Panel";
import { ToolGuide } from "@/components/ToolGuide";
import { integer, money } from "@/services/format";
import { MISSING_CREATURE_IMAGE, MISSING_ITEM_IMAGE, getMonsterImagePath } from "@/source/web/src/reina-core/assets";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { ExportCard } from "@/source/web/src/features/hunt-analyzer/components/HuntExportCards";
import { HuntHistoryPanel } from "@/source/web/src/features/hunt-analyzer/components/HuntHistoryPanel";
import { HuntEconomyService } from "@/source/web/src/features/hunt-analyzer/services/hunt-economy-service";
import { HuntExportService } from "@/source/web/src/features/hunt-analyzer/services/hunt-export-service";
import { HuntHistoryService, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import { ImbuementInsightService } from "@/source/web/src/features/imbuement-database/services/imbuement-insight-service";
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
  const [isVideoRendering, setIsVideoRendering] = useState(false);
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

  function applyImbuementMaterialSuggestion(item: HuntSummary["imbuementLootItems"][number], unitPrice: number) {
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;

    const nextPrices = {
      ...imbuementMarketPrices,
      [ImbuementMarketService.getMaterialPriceKey(item)]: unitPrice
    };

    setImbuementMarketPrices(nextPrices);
    ImbuementMarketService.savePrices(server, nextPrices);
    ImbuementInsightService.rememberMaterialPrice(item, unitPrice, server, "Hunt Analyzer");
  }

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
      setImportError("Não foi possível importar nenhum arquivo selecionado.");
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
      setImportError(error instanceof Error ? error.message : "Não foi possível ler o texto da hunt.");
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
      throw new Error("Não foi possível processar a hunt.");
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
    const canvas = await HuntExportService.renderCanvas(card);
    const link = document.createElement("a");
    link.download = HuntExportService.createFileName("hunt-report", "png");
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportPdf() {
    const card = getExportCardElement();
    if (!card) return;
    const pdf = await HuntExportService.renderPdf(card);
    pdf.save(HuntExportService.createFileName("hunt-report", "pdf"));
  }

  async function sharePng() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("");
    const canvas = await HuntExportService.renderCanvas(card);
    const blob = await HuntExportService.canvasToBlob(canvas, "image/png");
    const fileName = HuntExportService.createFileName("hunt-report", "png");
    const file = new File([blob], fileName, { type: "image/png" });
    const shared = await HuntExportService.shareFile(file, "ReinaHub Hunt Report", "Resumo de hunt gerado no ReinaHub.");
    setExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador não suporta compartilhar este arquivo; PNG baixado.");
    if (!shared) HuntExportService.downloadBlob(blob, fileName);
  }

  async function sharePdf() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("");
    const pdf = await HuntExportService.renderPdf(card);
    const blob = pdf.output("blob");
    const fileName = HuntExportService.createFileName("hunt-report", "pdf");
    const file = new File([blob], fileName, { type: "application/pdf" });
    const shared = await HuntExportService.shareFile(file, "ReinaHub Hunt Report", "Resumo de hunt gerado no ReinaHub.");
    setExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador não suporta compartilhar este arquivo; PDF baixado.");
    if (!shared) HuntExportService.downloadBlob(blob, fileName);
  }

  async function exportVideo() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("Gerando video animado...");
    setIsVideoRendering(true);
    try {
      const blob = await HuntExportService.renderAnimatedVideo(card);
      HuntExportService.downloadBlob(blob, HuntExportService.createFileName("hunt-report", "webm"));
      setExportMessage("Video animado gerado em WebM.");
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Nao foi possivel gerar o video animado.");
    } finally {
      setIsVideoRendering(false);
    }
  }

  async function shareVideo() {
    const card = getExportCardElement();
    if (!card) return;
    setExportMessage("Gerando video animado...");
    setIsVideoRendering(true);
    try {
      const blob = await HuntExportService.renderAnimatedVideo(card);
      const fileName = HuntExportService.createFileName("hunt-report", "webm");
      const file = new File([blob], fileName, { type: blob.type || "video/webm" });
      const shared = await HuntExportService.shareFile(file, "ReinaHub Hunt Report", "Resumo animado de hunt gerado no ReinaHub.");
      setExportMessage(shared ? "Compartilhamento de video aberto." : "Seu navegador nao suporta compartilhar este video; WebM baixado.");
      if (!shared) HuntExportService.downloadBlob(blob, fileName);
    } catch (error) {
      setExportMessage(error instanceof Error ? error.message : "Nao foi possivel compartilhar o video animado.");
    } finally {
      setIsVideoRendering(false);
    }
  }

  function generateExportCard() {
    setPreview(true);
    setExportMessage("Imagem gerada. Agora você pode baixar ou compartilhar.");
  }

  function getExportCardElement() {
    if (preview && cardRef.current) return cardRef.current;
    setExportMessage("Precisa gerar a imagem antes de baixar ou compartilhar.");
    return null;
  }

  return (
    <AppShell current="hunt" mark="HA" subtitle="Hunt Analyzer - loot - exportação">
      <ToolGuide
        title="Fluxo recomendado"
        summary="Importe uma hunt, confira o resumo, revise loot/imbuements e gere o card apenas quando quiser compartilhar."
        steps={[
          {
            moduleKey: "hunt",
            title: "1. Importar ou colar",
            description: "Use arquivo JSON/TXT ou cole o texto copiado do Session Analyzer."
          },
          {
            moduleKey: "cotacao",
            title: "2. Conferir contexto",
            description: "O balance usa o servidor ativo para converter GC em moeda premium e reais.",
            href: "/cotacao"
          },
          {
            moduleKey: "imbuement",
            title: "3. Revisar imbuements",
            description: "Materiais encontrados podem usar preços de Market salvos no Imbuement Database.",
            href: "/imbuements"
          },
          {
            moduleKey: "live-goal",
            title: "4. Compartilhar",
            description: "Gere PNG/PDF da hunt ou use metas no Live Goal para acompanhar progresso.",
            href: "/live-goal"
          }
        ]}
      />
      {!summary ? (
        <>
          <div className="tabs">
            {[
              { key: "import", label: "I - Importar" },
              { key: "history", label: `II - Histórico (${history.length})` }
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
                    setImportError(error instanceof Error ? error.message : "Não foi possível importar o arquivo.");
                  })}
                />
                <div style={{ fontSize: 42, marginBottom: 14 }}>HA</div>
                <h2 style={{ fontFamily: "var(--font-display)", letterSpacing: 1 }}>Importar Sessão de Hunt</h2>
                <p className="note">Arraste ou selecione um ou vários JSON/TXT exportados da hunt.</p>
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
          <Panel title="Sessão de Hunt" eyebrow={fileName || summary.sessionLength}>
            <div className="hero-grid">
              <Hero label="Balance" value={`${integer(summary.balance)} gp`} sub={`Loot ${integer(summary.lootValue)} (${lootSourceLabel(summary)}) - Suprimentos ${integer(summary.supplies)}`} tone="gold" />
              <Hero label="XP ganho" value={integer(summary.xpGain)} sub={`${integer(summary.xpHour)} XP/h`} />
              <Hero label="Monstros mortos" value={integer(summary.totalKills)} sub={`${summary.kills.length} espécies`} />
              <Hero label="Dano total" value={integer(summary.damage)} sub={`${integer(summary.damageHour)} dano/h`} />
              <Hero label="Duração" value={summary.sessionLength} sub={summary.sessionStart.split(",")[0] ?? ""} />
              <Hero label="Itens lootados" value={`${summary.loot.length} tipos`} sub={`Cura ${integer(summary.healing)}`} />
              <Hero label="Materiais imbue" value={`${summary.imbuementSummary.totalMaterialTypes} tipos`} sub={`${integer(summary.imbuementSummary.totalMaterialCount)} itens`} />
              <Hero label="Valor imbue" value={`${integer(imbuementMarketSummary.totalMarketValue)} gp`} sub={`${imbuementMarketSummary.pricedTypes}/${summary.imbuementSummary.totalMaterialTypes} com preço`} tone="gold" />
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

          <Panel title="Detalhes da hunt" eyebrow="monstros - loot - gráfico">
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
                onApplySuggestion={applyImbuementMaterialSuggestion}
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
              <button className="quick-btn" type="button" onClick={exportVideo} disabled={isVideoRendering}>
                {isVideoRendering ? <Loader2 size={15} className="spin-icon" /> : <Film size={15} />} Baixar video
              </button>
              <button className="quick-btn" type="button" onClick={sharePng}><Share2 size={15} /> Compartilhar PNG</button>
              <button className="quick-btn" type="button" onClick={sharePdf}><Share2 size={15} /> Compartilhar PDF</button>
              <button className="quick-btn" type="button" onClick={shareVideo} disabled={isVideoRendering}><Share2 size={15} /> Compartilhar video</button>
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

function ImbuementLootPanel({
  summary,
  marketPrices,
  marketSummary,
  premium,
  brl,
  server,
  onApplySuggestion
}: {
  summary: HuntSummary;
  marketPrices: ImbuementMarketPriceMap;
  marketSummary: HuntImbuementMarketSummary;
  premium: number;
  brl: number;
  server: VaultServer | null;
  onApplySuggestion: (item: HuntSummary["imbuementLootItems"][number], unitPrice: number) => void;
}) {
  if (!summary.imbuementLootItems.length) {
    return <div className="empty-msg">Nenhum material de imbuement encontrado nesta hunt.</div>;
  }

  const missingPriceTypes = Math.max(0, summary.imbuementSummary.totalMaterialTypes - marketSummary.pricedTypes);
  const suggestedPriceTypes = summary.imbuementLootItems.filter((item) => {
    const unitPrice = marketPrices[ImbuementMarketService.getMaterialPriceKey(item)];
    const hasPrice = Number.isFinite(unitPrice) && unitPrice > 0;
    return !hasPrice && Boolean(ImbuementInsightService.getMaterialPriceSuggestion(item, server));
  }).length;

  return (
    <div>
      <div className="hero-grid" style={{ marginBottom: 16 }}>
        <Hero label="Materiais encontrados" value={`${summary.imbuementSummary.totalMaterialTypes} tipos`} sub={`${integer(summary.imbuementSummary.totalMaterialCount)} itens lootados`} />
        <Hero label="Imbuements relacionados" value={`${summary.imbuementSummary.relatedImbuements.length}`} sub="basic / intricate / powerful" />
        <Hero label="Valor Market salvo" value={`${integer(marketSummary.totalMarketValue)} gp`} sub={`${marketSummary.pricedTypes}/${summary.imbuementSummary.totalMaterialTypes} materiais com preço`} tone="gold" />
        <Hero label={server ? `Em ${server.moeda}` : "Moeda premium"} value={server ? money(premium, 4) : "-"} sub={server ? `R$ ${money(brl, 2)}` : "configure a cotação"} />
      </div>

      <div className="market-card" style={{ marginBottom: 16 }}>
        <div className="label">Fluxo de imbuements</div>
        <p className="note" style={{ margin: "8px 0 0" }}>
          O Hunt Analyzer usa a mesma memoria de precos do Imbuement Database. Precos aplicados aqui ficam salvos no servidor ativo.
        </p>
        <div className="quick-row" style={{ marginTop: 12 }}>
          <span className="tag-pill">{marketSummary.pricedTypes} com preco</span>
          <span className="tag-pill">{missingPriceTypes} sem preco</span>
          <span className="tag-pill">{suggestedPriceTypes} sugestao(oes)</span>
          <Link className="quick-btn" href="/imbuements">Abrir Imbuement Database</Link>
        </div>
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
          const suggestion = hasPrice ? null : ImbuementInsightService.getMaterialPriceSuggestion(item, server);
          const insight = ImbuementInsightService.getMaterialInsight(item, hasPrice ? unitPrice : "");
          const primaryUsage = item.imbuementUsages[0];

          return (
            <div className="history-item" key={`${item.Name}-${item.Count}`}>
              <LinkedHuntEntity
                avatar="item"
                href={item.itemId ? `/items?itemId=${item.itemId}` : undefined}
                imagePath={item.imagePath}
                name={item.Name}
                subtitle={item.imbuementUsages.slice(0, 2).map((usage) => usage.group).join(", ")}
              />
              <span style={{ color: "var(--gold)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <span>{integer(item.Count)}x</span>
                <span className="note">
                  {hasPrice ? `${integer(totalValue)} gp` : suggestion ? `sug.: ${integer(suggestion.value)} gp` : insight.label}
                </span>
                {suggestion ? (
                  <button className="quick-btn" type="button" onClick={() => onApplySuggestion(item, suggestion.value)}>
                    Usar sugestao
                  </button>
                ) : null}
                {primaryUsage ? (
                  <Link className="quick-btn" href={`/imbuements?imbuement=${encodeURIComponent(primaryUsage.imbuementId)}`}>
                    Revisar
                  </Link>
                ) : null}
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
        Estes itens foram lidos da hunt, mas ainda não casaram com `items.json`. Use esta lista para revisar aliases,
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

function lootSourceLabel(summary: { lootValueSource?: string; lootCoverage?: number }) {
  if (summary.lootValueSource === "database") {
    return `base ReinaHub - ${Math.round((summary.lootCoverage ?? 0) * 100)}% dos tipos precificados`;
  }
  if (summary.lootValueSource === "game") return "valor do jogo";
  return "valor do jogo";
}
