"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Tabs } from "@/components/Tabs";
import { integer, money, moneySmart } from "@/services/format";
import {
  QUOTE_HISTORY_KEY,
  getActiveServerId,
  getServerDisplayName,
  getServerPlatformName,
  getServerWorldName,
  goldToPremium,
  loadServers,
  premiumToBrl,
  saveQuoteSnapshot,
  saveServers,
  setActiveServerId
} from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import type { QuoteSnapshot, VaultServer } from "@/types/vault";

type ServerForm = Omit<VaultServer, "id">;

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

export default function CotacaoPage() {
  const [tab, setTab] = useState("servidores");
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [activeId, setActiveId] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [gold, setGold] = useState(100000);
  const [history, setHistory] = useState<QuoteSnapshot[]>([]);

  useEffect(() => {
    const loaded = loadServers();
    setServers(loaded);
    setActiveId(getActiveServerId() || loaded[0]?.id || "");
    setHistory(StorageService.get<QuoteSnapshot[]>(QUOTE_HISTORY_KEY, []));
  }, []);

  const activeServer = useMemo(
    () => servers.find((server) => server.id === activeId) ?? servers[0] ?? null,
    [servers, activeId]
  );

  const premium = activeServer ? goldToPremium(activeServer, gold) : 0;
  const brlVenda = activeServer ? premiumToBrl(activeServer, premium, "venda") : 0;
  const brlCompra = activeServer ? premiumToBrl(activeServer, premium, "compra") : 0;

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
  }

  function editServer(server: VaultServer) {
    setEditingId(server.id);
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
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function activate(id: string) {
    setActiveId(id);
    setActiveServerId(id);
  }

  function removeServer(id: string) {
    const next = servers.filter((server) => server.id !== id);
    persist(next);
    if (activeId === id) activate(next[0]?.id ?? "");
  }

  function snapshot() {
    if (!activeServer) return;
    setHistory(saveQuoteSnapshot(activeServer));
  }

  return (
    <AppShell current="cotacao" mark="CC" subtitle="Cotacao Central - multi-servidor">
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "servidores", label: "I - Servidores" },
          { key: "conversor", label: "II - Conversor" },
          { key: "historico", label: "III - Historico" },
          { key: "sobre", label: "IV - Como funciona" }
        ]}
      />

      {tab === "servidores" ? (
        <>
          <Panel title="Meus servidores / mundos" eyebrow="fonte unica do hub">
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
                    1 {server.moeda} = {integer(server.gcPorMoeda)} gc - lote base {server.lote}
                  </div>
                  <div className="quick-row">
                    <span className="quick-btn">Venda R$ {moneySmart(server.loteVenda / server.lote)}</span>
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

          <Panel title={editingId ? "Editar servidor / mundo" : "Adicionar servidor / mundo"} eyebrow={editingId ? "alterar cadastro" : "novo cadastro"}>
            <div className="inputs-grid">
              <Field label="Servidor / plataforma">
                <input value={form.plataforma ?? ""} onChange={(e) => setForm({ ...form, plataforma: e.target.value })} placeholder="Tibia Global, RubiniOT..." />
              </Field>
              <Field label="Mundo">
                <input value={form.mundo ?? form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value, mundo: e.target.value })} placeholder="Yubra, DeusOT, Taleon..." />
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
              <Field label="Preco do lote - venda">
                <div className="field-wrap">
                  <span className="field-prefix">R$</span>
                  <input className="with-prefix" type="number" step="0.000001" value={form.loteVenda} onChange={(e) => setForm({ ...form, loteVenda: Number(e.target.value) })} />
                </div>
              </Field>
              <Field label="Preco do lote - compra">
                <div className="field-wrap">
                  <span className="field-prefix">R$</span>
                  <input className="with-prefix" type="number" step="0.000001" value={form.loteCompra} onChange={(e) => setForm({ ...form, loteCompra: Number(e.target.value) })} />
                </div>
              </Field>
            </div>
            <p className="note">
              Para Tibia Coin, use lote base 25. Os calculos consideram o preco do lote e derivam o valor unitario automaticamente.
            </p>
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={saveServer}>{editingId ? "Salvar alteracoes" : "Salvar servidor"}</button>
              <button className="quick-btn" type="button" onClick={resetForm}>Limpar formulario</button>
            </div>
          </Panel>
        </>
      ) : null}

      {tab === "conversor" ? (
        <>
          <div className="verdict">
            <div className="label">Servidor ativo</div>
            <div className="value gold">{activeServer ? getServerDisplayName(activeServer) : "-"}</div>
            <div className="note">{activeServer ? `1 ${activeServer.moeda} = ${integer(activeServer.gcPorMoeda)} gc - lote base ${activeServer.lote}` : "Cadastre um servidor"}</div>
          </div>
          <Panel title="Conversor de valores" eyebrow="gold - moeda premium - real">
            <Field label="Quantidade em Gold Coins">
              <div className="field-wrap">
                <span className="field-suffix">gc</span>
                <input className="with-suffix" type="number" value={gold} onChange={(e) => setGold(Number(e.target.value))} />
              </div>
            </Field>
            <div className="quick-row">
              {[80000, 800000, 2000000].map((value) => (
                <button className="quick-btn" key={value} type="button" onClick={() => setGold(value)}>
                  {integer(value)} gc
                </button>
              ))}
            </div>
          </Panel>
          <div className="slots">
            <ResultSlot label="Platinum coins" value={`${money(gold / 100, 2)} pc`} />
            <ResultSlot label="Crystal coins" value={`${money(gold / 10000, 4)} cc`} />
            <ResultSlot label="Moeda premium" value={`${money(premium, 4)} ${activeServer?.moeda ?? ""}`} tone="gold" />
            <ResultSlot label="Se eu vender (recebo)" value={`R$ ${moneySmart(brlVenda)}`} tone="red" />
            <ResultSlot label="Custo para comprar" value={`R$ ${moneySmart(brlCompra)}`} />
            <ResultSlot label="Spread" value={`R$ ${moneySmart(brlCompra - brlVenda)}`} tone="gold" />
          </div>
          <p className="note">
            Para Tibia Coin, compra e venda usam o lote base de 25 TC e seus multiplos. Valores em reais pequenos exibem mais casas decimais quando necessario.
          </p>
        </>
      ) : null}

      {tab === "historico" ? (
        <Panel title="Historico de cotacoes" eyebrow="snapshots locais">
          <div className="quick-row" style={{ marginBottom: 16 }}>
            <button className="quick-btn primary" type="button" onClick={snapshot}>Salvar cotacao atual</button>
            <button className="quick-btn danger" type="button" onClick={() => { StorageService.remove(QUOTE_HISTORY_KEY); setHistory([]); }}>Limpar historico</button>
          </div>
          <div className="history-list">
            {history.length ? history.slice().reverse().map((entry) => (
              <div className="history-item" key={entry.ts}>
                <span>{new Date(entry.ts).toLocaleString("pt-BR")} - {entry.nome}</span>
                <span style={{ color: "var(--gold)" }}>1 {entry.moeda} = {integer(entry.gcPorMoeda)} gc - R$ {money(entry.unitVenda, 4)}/{money(entry.unitCompra, 4)}</span>
              </div>
            )) : <div className="empty-msg">Nenhum snapshot salvo ainda.</div>}
          </div>
        </Panel>
      ) : null}

      {tab === "sobre" ? (
        <Panel title="Como funciona" eyebrow="coracao do hub">
          <div className="market-grid">
            <div className="market-card"><div className="label">Multi-servidor</div><p className="note">Cada mundo tem sua moeda, lote e taxas salvos localmente.</p></div>
            <div className="market-card"><div className="label">Servidor ativo</div><p className="note">Os outros modulos leem sempre a cotacao ativa daqui.</p></div>
            <div className="market-card"><div className="label">Historico</div><p className="note">Snapshots permitem acompanhar variacao de mercado.</p></div>
            <div className="market-card"><div className="label">Calculo</div><p className="note">gc para moeda premium, e moeda premium para reais pelo preco unitario do lote.</p></div>
          </div>
        </Panel>
      ) : null}
    </AppShell>
  );
}
