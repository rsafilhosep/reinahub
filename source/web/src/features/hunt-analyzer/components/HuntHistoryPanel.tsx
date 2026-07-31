"use client";

import { Download, Eye, Share2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Bar } from "react-chartjs-2";
import { BarElement, CategoryScale, Chart as ChartJS, LinearScale, Tooltip } from "chart.js";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { EmptyState } from "@/components/EmptyState";
import { MonsterAvatar } from "@/components/GameAvatar";
import { Panel } from "@/components/Panel";
import { integer, money } from "@/services/format";
import { MISSING_ITEM_IMAGE } from "@/source/web/src/reina-core/assets";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { HuntExportService } from "@/source/web/src/features/hunt-analyzer/services/hunt-export-service";
import { HuntHistoryService, type HuntHistoryPeriod, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import type { VaultServer } from "@/types/vault";
import { HistoryExportCard } from "./HuntExportCards";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

export function HuntHistoryPanel({
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
    const canvas = await HuntExportService.renderCanvas(card);
    const link = document.createElement("a");
    link.download = HuntExportService.createFileName("hunt-history-report", "png");
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function exportHistoryPdf() {
    const card = getHistoryExportCardElement();
    if (!card) return;
    const pdf = await HuntExportService.renderPdf(card);
    pdf.save(HuntExportService.createFileName("hunt-history-report", "pdf"));
  }

  async function shareHistoryPng() {
    const card = getHistoryExportCardElement();
    if (!card) return;
    setHistoryExportMessage("");
    const canvas = await HuntExportService.renderCanvas(card);
    const blob = await HuntExportService.canvasToBlob(canvas, "image/png");
    const fileName = HuntExportService.createFileName("hunt-history-report", "png");
    const file = new File([blob], fileName, { type: "image/png" });
    const shared = await HuntExportService.shareFile(file, "ReinaHub Hunt History", "Resumo de hunts gerado no ReinaHub.");
    setHistoryExportMessage(shared ? "Compartilhamento aberto." : "Seu navegador nao suporta compartilhar este arquivo; PNG baixado.");
    if (!shared) HuntExportService.downloadBlob(blob, fileName);
  }

  if (!history.length) {
    return (
      <Panel title="Historico de hunts" eyebrow="salvo localmente">
        <EmptyState
          moduleKey="hunt"
          title="Nenhuma hunt salva ainda"
          description="Importe um arquivo JSON/TXT ou cole o texto do Session Analyzer. Depois disso, o ReinaHub monta historico, graficos, comparacoes e exportacoes."
        />
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
          {!filteredHistory.length ? (
            <EmptyState
              moduleKey="hunt"
              title="Nenhuma hunt neste filtro"
              description="Altere o periodo ou importe novas hunts para preencher esta lista."
            />
          ) : null}
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
              <EmptyState
                moduleKey="hunt"
                title="Escolha duas hunts diferentes"
                description="Use uma sessao como base e outra como comparacao para ver diferencas de balance, XP, loot e monstros."
              />
            )}
          </>
        ) : (
          <EmptyState
            moduleKey="hunt"
            title="Comparacao ainda indisponivel"
            description="Salve pelo menos duas hunts no mesmo contexto para liberar comparacao entre sessoes."
          />
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

function Hero({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "gold" }) {
  return <div className="hero-card"><div className="label">{label}</div><div className={`value ${tone ?? ""}`}>{value}</div><div className="note">{sub}</div></div>;
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

function getHistoryPeriodLabel(period: HuntHistoryPeriod, customStart: string, customEnd: string) {
  if (period === "7d") return "Ultimos 7 dias";
  if (period === "30d") return "Ultimos 30 dias";
  if (period === "custom") return `${customStart || "inicio"} - ${customEnd || "hoje"}`;
  return "Todo o historico";
}

function getHuntHistoryContextLabel(record: HuntHistoryRecord) {
  return record.characterName || record.profileName || record.serverName || "sem contexto";
}
