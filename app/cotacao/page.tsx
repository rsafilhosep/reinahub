"use client";

import { Calculator, DatabaseZap, Globe2, HandCoins, History, Pencil, ServerCog, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Modal } from "@/components/Modal";
import { Tabs } from "@/components/Tabs";
import { currencyShortName, integer, money, moneySmart } from "@/services/format";
import { ManualPriceSourceService, type ManualPriceSource, type ManualPriceSourceInput } from "@/services/manual-price-source-service";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { ExternalQuoteReadResult } from "@/source/web/src/reina-core/external-quotes/external-quote-source.types";
import worldCatalog from "@/source/web/src/reina-core/worlds/generated/world-catalog.json";
import {
  QUOTE_HISTORY_KEY,
  getActiveServerId,
  getServerDisplayName,
  getServerPlatformName,
  getServerWorldName,
  goldToPremium,
  hasInvertedSpread,
  loadServers,
  premiumToBrl,
  saveQuoteSnapshot,
  saveServers
} from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import type { QuoteSnapshot, VaultServer } from "@/types/vault";

type ServerForm = Omit<VaultServer, "id">;
type ManualPriceSourceForm = Omit<ManualPriceSourceInput, "serverId">;
type WorldCatalogEntry = {
  platform: string;
  world: string;
  type: "global" | "ot";
  premiumCurrency: string;
  defaultLot: number;
  pvpType?: string;
  location?: string;
  confidence?: string;
};

const worldCatalogEntries = worldCatalog.worlds as WorldCatalogEntry[];
const worldCatalogPlatforms = Array.from(new Set(worldCatalogEntries.map((entry) => entry.platform))).sort((a, b) => a.localeCompare(b));

const emptyForm: ServerForm = {
  nome: "",
  plataforma: "",
  mundo: "",
  tipo: "ot" as const,
  moeda: "",
  lote: 25,
  gcPorMoeda: 0,
  loteVenda: 0,
  loteCompra: 0
};

const emptyPriceSourceForm: ManualPriceSourceForm = {
  label: "",
  kind: "reseller",
  url: "",
  loteVenda: 0,
  loteCompra: 0,
  minimumPlayerSellQuantity: 25,
  minimumPlayerBuyQuantity: 25,
  note: ""
};

const externalPriceSourceReferences = [
  {
    label: "TibiaPay",
    url: "https://tibiapay.com.br/",
    note: "Referencia externa para compra/venda de moedas premium."
  },
  {
    label: "Coins4Gamers - Tibia Coins",
    url: "https://coins4gamers.com.br/tibia/tibia-coins",
    note: "Referencia externa para Tibia Coins."
  },
  {
    label: "Coins4Gamers - Rubini Coins",
    url: "https://coins4gamers.com.br/rubinot/rubinot-coins",
    note: "Referencia externa para Rubini Coins."
  }
];

export default function CotacaoPage() {
  const [tab, setTab] = useState("servidores");
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [activeId, setActiveId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [catalogPlatform, setCatalogPlatform] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [priceSources, setPriceSources] = useState<ManualPriceSource[]>([]);
  const [priceSourceForm, setPriceSourceForm] = useState<ManualPriceSourceForm>(emptyPriceSourceForm);
  const [editingPriceSourceId, setEditingPriceSourceId] = useState<string | null>(null);
  const [externalQuoteResults, setExternalQuoteResults] = useState<ExternalQuoteReadResult[]>([]);
  const [externalQuoteLoading, setExternalQuoteLoading] = useState(false);
  const [externalQuoteMessage, setExternalQuoteMessage] = useState("");
  const [gold, setGold] = useState(100000);
  const [history, setHistory] = useState<QuoteSnapshot[]>([]);

  useEffect(() => {
    const loaded = loadServers();
    setServers(loaded);
    setActiveId(getActiveServerId() || loaded[0]?.id || "");
    setPriceSources(ManualPriceSourceService.load());
    setHistory(StorageService.get<QuoteSnapshot[]>(QUOTE_HISTORY_KEY, []));
  }, []);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeId) ?? servers[0] ?? null,
    [servers, activeId]
  );

  const premium = activeServer ? goldToPremium(activeServer, gold) : 0;
  const brlVenda = activeServer ? premiumToBrl(activeServer, premium, "venda") : 0;
  const brlCompra = activeServer ? premiumToBrl(activeServer, premium, "compra") : 0;
  const activePriceSources = activeServer ? priceSources.filter((source) => source.serverId === activeServer.id) : [];
  const activeCurrencyShort = currencyShortName(activeServer?.moeda) || activeServer?.moeda || "";
  const filteredWorldCatalogEntries = useMemo(
    () => worldCatalogEntries.filter((entry) => entry.platform === catalogPlatform),
    [catalogPlatform]
  );

  function persist(next: VaultServer[]) {
    setServers(next);
    saveServers(next);
    window.dispatchEvent(new Event("reinahub:quote-change"));
  }

  function saveServer() {
    const platform = form.plataforma?.trim() || (form.tipo === "global" ? "Tibia Global" : "OTServer");
    const world = form.mundo?.trim() || form.nome.trim();
    if (!world) return;
    const server: VaultServer = {
      id: editingId ?? `srv_${Date.now()}`,
      nome: world,
      plataforma: platform,
      mundo: world,
      tipo: form.tipo,
      moeda: form.moeda.trim() || "Moeda Premium",
      lote: Number(form.lote) || 25,
      gcPorMoeda: Number(form.gcPorMoeda) || 0,
      loteVenda: Number(form.loteVenda) || 0,
      loteCompra: Number(form.loteCompra) || 0
    };
    const next = editingId ? servers.map((item) => (item.id === editingId ? server : item)) : [...servers, server];
    persist(next);
    if (!activeId || editingId === activeId) activate(server.id);
    resetForm();
    setIsServerModalOpen(false);
  }

  function editServer(server: VaultServer) {
    setEditingId(server.id);
    setCatalogPlatform(getServerPlatformName(server));
    setForm({
      nome: getServerWorldName(server),
      plataforma: getServerPlatformName(server),
      mundo: getServerWorldName(server),
      tipo: server.tipo,
      moeda: server.moeda,
      lote: server.lote,
      gcPorMoeda: server.gcPorMoeda,
      loteVenda: server.loteVenda,
      loteCompra: server.loteCompra
    });
    setTab("servidores");
    setIsServerModalOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setCatalogPlatform("");
    setForm(emptyForm);
  }

  function openNewServerModal() {
    resetForm();
    setIsServerModalOpen(true);
  }

  function applyWorldCatalog(value: string) {
    const entry = worldCatalogEntries.find((item) => `${item.platform}:::${item.world}` === value);
    if (!entry) return;
    setCatalogPlatform(entry.platform);
    setForm({
      ...form,
      plataforma: entry.platform,
      nome: entry.world,
      mundo: entry.world,
      tipo: entry.type,
      moeda: entry.premiumCurrency,
      lote: entry.defaultLot
    });
  }

  function applyCatalogPlatform(platform: string) {
    if (platform === "__manual__") {
      setCatalogPlatform("");
      setForm({
        ...form,
        plataforma: "",
        mundo: "",
        nome: "",
        tipo: "ot",
        moeda: "",
        lote: form.lote || 25
      });
      return;
    }

    setCatalogPlatform(platform);
    if (!platform) return;
    const firstEntry = worldCatalogEntries.find((entry) => entry.platform === platform);
    setForm({
      ...form,
      plataforma: platform,
      tipo: firstEntry?.type ?? form.tipo,
      moeda: firstEntry?.premiumCurrency ?? form.moeda,
      lote: firstEntry?.defaultLot ?? form.lote
    });
  }

  function activate(id: string) {
    setActiveId(id);
    ReinaEconomyService.setActiveServer(id);
  }

  function removeServer(id: string) {
    const next = servers.filter((server) => server.id !== id);
    persist(next);
    if (activeId === id) activate(next[0]?.id ?? "");
  }

  function savePriceSource() {
    if (!activeServer) return;
    const next = ManualPriceSourceService.save({
      ...priceSourceForm,
      serverId: activeServer.id
    }, editingPriceSourceId);
    setPriceSources(next);
    resetPriceSourceForm();
  }

  function editPriceSource(source: ManualPriceSource) {
    setEditingPriceSourceId(source.id);
    setPriceSourceForm({
      label: source.label,
      kind: source.kind,
      url: source.url ?? "",
      loteVenda: source.loteVenda,
      loteCompra: source.loteCompra,
      minimumPlayerSellQuantity: source.minimumPlayerSellQuantity || activeServer?.lote || 25,
      minimumPlayerBuyQuantity: source.minimumPlayerBuyQuantity || activeServer?.lote || 25,
      note: source.note
    });
  }

  function resetPriceSourceForm() {
    setEditingPriceSourceId(null);
    setPriceSourceForm(emptyPriceSourceForm);
  }

  function removePriceSource(id: string) {
    setPriceSources(ManualPriceSourceService.remove(id));
    if (editingPriceSourceId === id) resetPriceSourceForm();
  }

  function applyPriceSource(source: ManualPriceSource) {
    if (!activeServer) return;
    const nextServer = {
      ...activeServer,
      loteVenda: source.loteVenda || activeServer.loteVenda,
      loteCompra: source.loteCompra || activeServer.loteCompra
    };
    const next = servers.map((server) => (server.id === activeServer.id ? nextServer : server));
    persist(next);
  }

  async function checkExternalQuoteSources() {
    setExternalQuoteLoading(true);
    setExternalQuoteMessage("");
    try {
      const response = await fetch("/api/external-quotes", { cache: "no-store" });
      const payload = await response.json();
      setExternalQuoteResults(Array.isArray(payload.results) ? payload.results : []);
      setExternalQuoteMessage("Fontes verificadas. Revise os valores antes de salvar.");
    } catch {
      setExternalQuoteMessage("Nao foi possivel verificar as fontes externas agora.");
    } finally {
      setExternalQuoteLoading(false);
    }
  }

  function fillPriceSourceFromExternalResult(result: ExternalQuoteReadResult) {
    if (!activeServer) return;
    const lotRatio = activeServer.lote / (result.lotSize || activeServer.lote || 25);
    setPriceSourceForm({
      label: result.label,
      kind: result.kind === "official" ? "official" : "reseller",
      url: result.url,
      loteVenda: result.playerSellLotPrice ? Number((result.playerSellLotPrice * lotRatio).toFixed(6)) : priceSourceForm.loteVenda,
      loteCompra: result.playerBuyLotPrice ? Number((result.playerBuyLotPrice * lotRatio).toFixed(6)) : priceSourceForm.loteCompra,
      note: `Candidato externo (${result.confidence}). Revisado em ${new Date(result.fetchedAt).toLocaleString("pt-BR")}.`
    });
  }

  function snapshot() {
    if (!activeServer) return;
    setHistory(saveQuoteSnapshot(activeServer));
  }

  return (
    <AppShell current="cotacao" mark="CC" subtitle="Cotação Central - multi-servidor">
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "servidores", label: "I - Servidores" },
          { key: "conversor", label: "II - Conversor" },
          { key: "historico", label: "III - Histórico" },
          { key: "sobre", label: "IV - Como funciona" }
        ]}
      />

      {tab === "servidores" ? (
        <>
          <Panel title="Cotação ativa" eyebrow="fonte única do hub">
            {activeServer ? (
              <>
                <div className="character-hero">
                  <div>
                    <div className="eyebrow">{getServerPlatformName(activeServer)}</div>
                    <h2 style={{ color: "var(--gold)", fontFamily: "var(--font-display)", fontSize: 30, margin: "4px 0", textTransform: "uppercase" }}>
                      {getServerWorldName(activeServer)}
                    </h2>
                    <p className="note">
                      Esta cotação alimenta Calculadora RC, Market Analyzer, Hunt Analyzer, Stash, Premium Goals e Live Goal.
                    </p>
                  </div>
                  <div className="character-actions">
                    <button className="quick-btn" type="button" onClick={() => editServer(activeServer)}>
                      <Pencil size={15} /> Editar ativa
                    </button>
                    <button className="quick-btn primary" type="button" onClick={openNewServerModal}>
                      Adicionar servidor
                    </button>
                  </div>
                </div>
                <div className="hero-grid">
                  <ResultSlot label="Moeda premium" value={activeCurrencyShort} tone="gold" />
                  <ResultSlot label={`Gold por ${activeCurrencyShort}`} value={`${integer(activeServer.gcPorMoeda)} GC`} />
                  <ResultSlot label="Jogador vende" value={`R$ ${moneySmart(activeServer.loteVenda / activeServer.lote)}`} />
                  <ResultSlot label="Jogador compra" value={`R$ ${moneySmart(activeServer.loteCompra / activeServer.lote)}`} tone="gold" />
                </div>
                {hasInvertedSpread(activeServer) ? (
                  <div className="empty-msg" style={{ borderColor: "var(--crimson)", color: "var(--crimson-glow)", marginTop: 16 }}>
                    Atenção: nesta cotação o valor para jogador vender está maior que o valor para jogador comprar. Confira se os campos não foram invertidos.
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-msg">Cadastre um servidor/mundo para iniciar as conversões do ReinaHub.</div>
            )}
          </Panel>

          <Panel title="Meus servidores / mundos" eyebrow="fonte única do hub">
            <div className="quick-row" style={{ marginBottom: 16 }}>
              <button className="quick-btn primary" type="button" onClick={openNewServerModal}>Adicionar servidor / mundo</button>
            </div>
            <div className="market-grid">
              {servers.map((server) => (
                <div
                  className="server-card"
                  key={server.id}
                  onClick={() => activate(server.id)}
                  style={{
                    padding: 18,
                    textAlign: "left",
                    cursor: "pointer",
                    borderColor: server.id === activeId ? "var(--teal-glow)" : "var(--line)"
                  }}
                >
                  <div className="label">{getServerPlatformName(server)}</div>
                  <div className="value gold" style={{ fontFamily: "var(--font-display)", fontSize: 18 }}>
                    {getServerWorldName(server)}
                  </div>
                  <div className="note">
                    1 {currencyShortName(server.moeda)} = {integer(server.gcPorMoeda)} GC - lote base {server.lote}
                  </div>
                  <div className="quick-row">
                    <span className="quick-btn">Vende R$ {moneySmart(server.loteVenda / server.lote)}</span>
                    <span className="quick-btn">Compra R$ {moneySmart(server.loteCompra / server.lote)}</span>
                    <span className="quick-btn" style={{ color: "var(--teal-glow)" }}>
                      {server.id === activeId ? "ativo" : "ativar"}
                    </span>
                    <button
                      className="icon-btn"
                      type="button"
                      title="Editar mundo"
                      onClick={(event) => {
                        event.stopPropagation();
                        editServer(server);
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      title="Excluir mundo"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeServer(server.id);
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="note">
              O mundo ativo alimenta a Calculadora RC, Market Analyzer e Hunt Analyzer.
            </p>
          </Panel>

          <Modal
            title={editingId ? "Editar servidor / mundo" : "Adicionar servidor / mundo"}
            eyebrow={editingId ? "alterar cadastro" : "novo cadastro"}
            open={isServerModalOpen}
            onClose={() => setIsServerModalOpen(false)}
          >
            <div className="world-picker">
              <Field label="1. Servidor / plataforma do catálogo">
                <select value={catalogPlatform} onChange={(event) => applyCatalogPlatform(event.target.value)}>
                  <option value="">Escolher plataforma...</option>
                  {worldCatalogPlatforms.map((platform) => (
                    <option value={platform} key={platform}>
                      {platform} ({worldCatalogEntries.filter((entry) => entry.platform === platform).length} mundos)
                    </option>
                  ))}
                  <option value="__manual__">Outro servidor / cadastro manual</option>
                </select>
              </Field>
              <Field label="2. Mundo do catálogo">
                <select
                  value=""
                  onChange={(event) => applyWorldCatalog(event.target.value)}
                  disabled={!catalogPlatform}
                >
                  <option value="">{catalogPlatform ? "Escolher mundo..." : "Escolha uma plataforma primeiro"}</option>
                  {filteredWorldCatalogEntries.map((entry) => (
                    <option value={`${entry.platform}:::${entry.world}`} key={`${entry.platform}-${entry.world}`}>
                      {entry.world}{entry.pvpType ? ` (${entry.pvpType})` : ""}{entry.location ? ` - ${entry.location}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="world-picker-summary">
                <div className="label">Catálogo local</div>
                <div className="note">
                  {catalogPlatform
                    ? `${filteredWorldCatalogEntries.length} mundo(s) em ${catalogPlatform}. Ao escolher um mundo, o ReinaHub preenche plataforma, moeda, tipo e lote base.`
                    : "Use o catálogo para preencher rápido ou escolha cadastro manual e informe qualquer OTServer/mundo abaixo."}
                </div>
                <button className="quick-btn" type="button" onClick={() => applyCatalogPlatform("__manual__")}>
                  Usar cadastro manual
                </button>
              </div>
            </div>
            <div className="inputs-grid">
              <Field label="Servidor / plataforma">
                <input value={form.plataforma ?? ""} onChange={(e) => setForm({ ...form, plataforma: e.target.value })} placeholder="Ex: Taleon, Canary, OTServer próprio..." />
              </Field>
              <Field label="Mundo">
                <input value={form.mundo ?? form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value, mundo: e.target.value })} placeholder="Ex: Elysian, Yubra, mundo custom..." />
              </Field>
              <Field label="Tipo">
                <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value as "global" | "ot" })}>
                  <option value="global">Tibia Global</option>
                  <option value="ot">OTServer</option>
                </select>
              </Field>
              <Field label="Moeda premium">
                <input value={form.moeda} onChange={(e) => setForm({ ...form, moeda: e.target.value })} />
              </Field>
              <Field label="Tamanho do lote base">
                <input type="number" value={form.lote} onChange={(e) => setForm({ ...form, lote: Number(e.target.value) })} />
              </Field>
              <Field label="Gold por moeda premium">
                <input type="number" value={form.gcPorMoeda} onChange={(e) => setForm({ ...form, gcPorMoeda: Number(e.target.value) })} />
              </Field>
              <Field label="Jogador vende - recebe por lote">
                <div className="field-wrap">
                  <span className="field-prefix">R$</span>
                  <input className="with-prefix" type="number" step="0.000001" value={form.loteVenda} onChange={(e) => setForm({ ...form, loteVenda: Number(e.target.value) })} />
                </div>
              </Field>
              <Field label="Jogador compra - paga por lote">
                <div className="field-wrap">
                  <span className="field-prefix">R$</span>
                  <input className="with-prefix" type="number" step="0.000001" value={form.loteCompra} onChange={(e) => setForm({ ...form, loteCompra: Number(e.target.value) })} />
                </div>
              </Field>
            </div>
            <p className="note">
              Para Tibia Coin, use lote base 25. O catálogo rápido é apenas sugestão local; confirme moeda, gold por moeda e preços antes de salvar.
            </p>
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={saveServer}>{editingId ? "Salvar alterações" : "Salvar servidor"}</button>
              <button className="quick-btn" type="button" onClick={resetForm}>Limpar formulário</button>
              <button className="quick-btn" type="button" onClick={() => setIsServerModalOpen(false)}>Cancelar</button>
            </div>
          </Modal>

          <CollapsiblePanel
            title="Fontes de cotação"
            eyebrow="oficial - revendedor - manual"
            summary={
              activeServer
                ? `${activePriceSources.length} fonte(s) salvas para ${getServerDisplayName(activeServer)}. Use para comparar jogador compra e jogador vende.`
                : "Cadastre ou selecione um servidor antes de adicionar fontes de cotação."
            }
          >
            <p className="note" style={{ marginTop: -4, marginBottom: 16 }}>
              Comprar = jogador compra do vendedor. Vender = jogador vende para o vendedor. Por enquanto o ReinaHub salva e compara fontes manualmente; a leitura automatica sera feita fonte por fonte quando existir um metodo confiavel.
            </p>
            {activeServer ? (
              <>
                <div className="history-list" style={{ marginBottom: 16 }}>
                  {externalPriceSourceReferences.map((source) => (
                    <div className="history-item" key={source.url}>
                      <span>
                        {source.label}
                        <span className="note" style={{ marginLeft: 10 }}>{source.note}</span>
                      </span>
                      <a className="quick-btn" href={source.url} target="_blank" rel="noreferrer">
                        Abrir site
                      </a>
                    </div>
                  ))}
                </div>
                <div className="quick-row" style={{ marginBottom: 16 }}>
                  <button className="quick-btn primary" type="button" onClick={checkExternalQuoteSources} disabled={externalQuoteLoading}>
                    {externalQuoteLoading ? "Verificando..." : "Verificar fontes externas"}
                  </button>
                  <span className="note">A leitura externa apenas sugere valores. Nada e salvo ou aplicado automaticamente.</span>
                </div>
                {externalQuoteMessage ? <p className="note" style={{ marginTop: -6 }}>{externalQuoteMessage}</p> : null}
                {externalQuoteResults.length ? (
                  <div className="history-list" style={{ marginBottom: 18 }}>
                    {externalQuoteResults.map((result) => {
                      const hasCandidate = result.playerSellLotPrice !== null || result.playerBuyLotPrice !== null;
                      return (
                        <div className="history-item external-quote-result" key={result.sourceId}>
                          <span>
                            {result.label}
                            <span className="note" style={{ marginLeft: 10 }}>
                              {getExternalQuoteStatusLabel(result.status)} - confianca {result.confidence}
                            </span>
                            <span className="note external-quote-snippet">{result.message}</span>
                            {result.snippets[0] ? <span className="note external-quote-snippet">Trecho: {result.snippets[0]}</span> : null}
                          </span>
                          <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <span style={{ color: "var(--gold)" }}>
                              Vende {result.playerSellLotPrice !== null ? `R$ ${moneySmart(result.playerSellLotPrice / result.lotSize)}/${currencyShortName(result.currency) || result.currency}` : "-"}
                            </span>
                            <span>
                              Compra {result.playerBuyLotPrice !== null ? `R$ ${moneySmart(result.playerBuyLotPrice / result.lotSize)}/${currencyShortName(result.currency) || result.currency}` : "-"}
                            </span>
                            {hasCandidate ? (
                              <button className="quick-btn" type="button" onClick={() => fillPriceSourceFromExternalResult(result)}>Usar no formulario</button>
                            ) : null}
                            <a className="quick-btn" href={result.url} target="_blank" rel="noreferrer">Abrir</a>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
                <div className="inputs-grid">
                  <Field label="Nome da fonte">
                    <input
                      value={priceSourceForm.label}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, label: event.target.value })}
                      placeholder="Ex: Oficial, Fonte 1, Cotação manual..."
                    />
                  </Field>
                  <Field label="Tipo">
                    <select
                      value={priceSourceForm.kind}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, kind: event.target.value as ManualPriceSourceForm["kind"] })}
                    >
                      <option value="official">Oficial</option>
                      <option value="reseller">Revendedor</option>
                      <option value="manual">Manual / outro</option>
                    </select>
                  </Field>
                  <Field label="URL da fonte">
                    <input
                      value={priceSourceForm.url ?? ""}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, url: event.target.value })}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Jogador vende - recebe por lote">
                    <div className="field-wrap">
                      <span className="field-prefix">R$</span>
                      <input
                        className="with-prefix"
                        type="number"
                        step="0.000001"
                        value={priceSourceForm.loteVenda}
                        onChange={(event) => setPriceSourceForm({ ...priceSourceForm, loteVenda: Number(event.target.value) })}
                      />
                    </div>
                  </Field>
                  <Field label="Jogador compra - paga por lote">
                    <div className="field-wrap">
                      <span className="field-prefix">R$</span>
                      <input
                        className="with-prefix"
                        type="number"
                        step="0.000001"
                        value={priceSourceForm.loteCompra}
                        onChange={(event) => setPriceSourceForm({ ...priceSourceForm, loteCompra: Number(event.target.value) })}
                        placeholder={priceSourceForm.kind === "official" ? "opcional" : ""}
                      />
                    </div>
                  </Field>
                  <Field label="Mínimo que a empresa compra">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={priceSourceForm.minimumPlayerSellQuantity ?? activeServer.lote}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, minimumPlayerSellQuantity: Number(event.target.value) })}
                      placeholder={`${activeServer.lote} moedas`}
                    />
                  </Field>
                  <Field label="Mínimo que a empresa vende">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={priceSourceForm.minimumPlayerBuyQuantity ?? activeServer.lote}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, minimumPlayerBuyQuantity: Number(event.target.value) })}
                      placeholder={`${activeServer.lote} moedas`}
                    />
                  </Field>
                  <Field label="Observacao">
                    <input
                      value={priceSourceForm.note}
                      onChange={(event) => setPriceSourceForm({ ...priceSourceForm, note: event.target.value })}
                      placeholder="Ex: atualizado hoje, conferir antes de negociar..."
                    />
                  </Field>
                </div>
                <div className="quick-row">
                  <button className="quick-btn primary" type="button" onClick={savePriceSource}>{editingPriceSourceId ? "Salvar fonte" : "Adicionar fonte"}</button>
                  <button className="quick-btn" type="button" onClick={resetPriceSourceForm}>Limpar fonte</button>
                </div>
                <div className="history-list" style={{ marginTop: 16 }}>
                  {activePriceSources.map((source) => (
                    <div className="history-item" key={source.id}>
                      <span>
                        {source.label}
                        <span className="note" style={{ marginLeft: 10 }}>
                          {getPriceSourceKindLabel(source.kind)} - {new Date(source.updatedAt).toLocaleString("pt-BR")}
                        </span>
                      </span>
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ color: "var(--gold)" }}>Jogador vende R$ {moneySmart(source.loteVenda / activeServer.lote)}</span>
                        <span>Jogador compra {source.loteCompra ? `R$ ${moneySmart(source.loteCompra / activeServer.lote)}` : "-"}</span>
                        {source.loteVenda ? <span className="status-pill">Empresa compra mín. {source.minimumPlayerSellQuantity || activeServer.lote}: R$ {moneySmart((source.loteVenda / activeServer.lote) * (source.minimumPlayerSellQuantity || activeServer.lote))}</span> : null}
                        {source.loteCompra ? <span className="status-pill">Empresa vende mín. {source.minimumPlayerBuyQuantity || activeServer.lote}: R$ {moneySmart((source.loteCompra / activeServer.lote) * (source.minimumPlayerBuyQuantity || activeServer.lote))}</span> : null}
                        {source.url ? (
                          <a className="quick-btn" href={source.url} target="_blank" rel="noreferrer">Abrir</a>
                        ) : null}
                        <button className="quick-btn" type="button" onClick={() => applyPriceSource(source)}>Aplicar</button>
                        <button className="quick-btn" type="button" onClick={() => editPriceSource(source)}>Editar</button>
                        <button className="quick-btn danger" type="button" onClick={() => removePriceSource(source.id)}>Remover</button>
                      </span>
                    </div>
                  ))}
                  {!activePriceSources.length ? <div className="empty-msg">Nenhuma fonte manual cadastrada para o servidor ativo.</div> : null}
                </div>
              </>
            ) : (
              <div className="empty-msg">Cadastre ou selecione um servidor antes de adicionar fontes manuais.</div>
            )}
          </CollapsiblePanel>
        </>
      ) : null}

      {tab === "conversor" ? (
        <>
          <div className="verdict">
            <div className="label">Servidor ativo</div>
            <div className="value gold">{activeServer ? getServerDisplayName(activeServer) : "-"}</div>
            <div className="note">{activeServer ? `1 ${activeCurrencyShort} = ${integer(activeServer.gcPorMoeda)} GC - lote base ${activeServer.lote}` : "Cadastre um servidor"}</div>
          </div>
          <Panel title="Conversor de valores" eyebrow="gold - moeda premium - real">
            <Field label="Quantidade em GC">
              <div className="field-wrap">
                <span className="field-suffix">GC</span>
                <input className="with-suffix" inputMode="numeric" value={integer(gold)} onChange={(e) => setGold(parseIntegerInput(e.target.value))} />
              </div>
            </Field>
            <div className="quick-row">
              {[80000, 800000, 2000000].map((value) => (
                <button className="quick-btn" key={value} type="button" onClick={() => setGold(value)}>
                  {integer(value)} GC
                </button>
              ))}
            </div>
          </Panel>
          <div className="slots">
            <ResultSlot label="Platinum Coins" value={`${money(gold / 100, 2)} PC`} />
            <ResultSlot label="Crystal Coins" value={`${money(gold / 10000, 4)} CC`} />
            <ResultSlot label="Moeda premium" value={`${money(premium, 4)} ${activeCurrencyShort}`} tone="gold" />
            <ResultSlot label="Se eu vender (recebo)" value={`R$ ${moneySmart(brlVenda)}`} tone="red" />
            <ResultSlot label="Custo para comprar" value={`R$ ${moneySmart(brlCompra)}`} />
            <ResultSlot label="Spread" value={`R$ ${moneySmart(brlCompra - brlVenda)}`} tone="gold" />
          </div>
          <p className="note">
            Para TC, compra e venda usam o lote base de 25 TC e seus multiplos. Valores em reais pequenos exibem mais casas decimais quando necessario.
          </p>
        </>
      ) : null}

      {tab === "historico" ? (
        <Panel title="Histórico de cotações" eyebrow="snapshots locais">
          <div className="quick-row" style={{ marginBottom: 16 }}>
            <button className="quick-btn primary" type="button" onClick={snapshot}>Salvar cotação atual</button>
            <button className="quick-btn danger" type="button" onClick={() => { StorageService.remove(QUOTE_HISTORY_KEY); setHistory([]); }}>Limpar histórico</button>
          </div>
          <div className="history-list">
            {history.length ? history.slice().reverse().map((entry) => (
              <div className="history-item" key={entry.ts}>
                <span>{new Date(entry.ts).toLocaleString("pt-BR")} - {entry.nome}</span>
                <span style={{ color: "var(--gold)" }}>1 {currencyShortName(entry.moeda)} = {integer(entry.gcPorMoeda)} GC - R$ {money(entry.unitVenda, 4)}/{money(entry.unitCompra, 4)}</span>
              </div>
            )) : <div className="empty-msg">Nenhum snapshot salvo ainda.</div>}
          </div>
        </Panel>
      ) : null}

      {tab === "sobre" ? (
        <Panel title="Como funciona" eyebrow="coracao do hub">
          <div className="market-grid">
            <InfoCard icon={Globe2} title="Multi-servidor" text="Cada mundo tem sua moeda, lote e taxas salvos localmente." />
            <InfoCard icon={ServerCog} title="Servidor ativo" text="Os outros módulos leem sempre a cotação ativa daqui." />
            <InfoCard icon={History} title="Histórico" text="Snapshots permitem acompanhar variação de mercado." />
            <InfoCard icon={Calculator} title="Cálculo" text="GC vira moeda premium, e moeda premium vira reais pelo preço unitário do lote." />
            <InfoCard icon={HandCoins} title="Fontes de cotação" text="Oficial, revendedor ou manual: sempre separando jogador compra de jogador vende." />
            <InfoCard icon={DatabaseZap} title="Fonte única" text="Market, Hunt, Stash e metas premium usam a mesma cotação ativa." />
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}

function InfoCard({ icon: Icon, title, text }: { icon: React.ElementType; title: string; text: string }) {
  return (
    <div className="market-card info-card">
      <div className="info-card-head">
        <span className="info-card-icon">
          <Icon size={18} aria-hidden="true" />
        </span>
        <div className="label">{title}</div>
      </div>
      <p className="note">{text}</p>
    </div>
  );
}

function getPriceSourceKindLabel(kind: ManualPriceSource["kind"]) {
  if (kind === "official") return "oficial";
  if (kind === "reseller") return "revendedor";
  return "manual";
}

function getExternalQuoteStatusLabel(status: ExternalQuoteReadResult["status"]) {
  if (status === "ok") return "ok";
  if (status === "needs-review") return "revisar";
  if (status === "manual-required") return "manual";
  if (status === "blocked") return "bloqueada";
  return "erro";
}

function parseIntegerInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
