"use client";

import { useEffect, useMemo, useState } from "react";
import { ActiveServerBanner } from "@/components/ActiveServerBanner";
import { AppShell } from "@/components/AppShell";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Tabs } from "@/components/Tabs";
import { integer, moneySmart } from "@/services/format";
import { getActiveServer, getServerDisplayName } from "@/services/quote-service";
import { StorageService } from "@/services/storage-service";
import type { QuoteSnapshot, VaultServer } from "@/types/vault";

export default function CalculadoraRcPage() {
  const [tab, setTab] = useState("calculadora");
  const [server, setServer] = useState<VaultServer | null>(null);
  const [precoPacote, setPrecoPacote] = useState(2.33);
  const [quantidade, setQuantidade] = useState(25);
  const [cotacao, setCotacao] = useState(80000);
  const [gold, setGold] = useState("100000000");
  const [goldMochila, setGoldMochila] = useState("5000000");
  const [goldBanco, setGoldBanco] = useState("80000000");
  const [history, setHistory] = useState<QuoteSnapshot[]>([]);

  useEffect(() => {
    const sync = () => {
      const active = getActiveServer();
      setServer(active);
      if (active) {
        setPrecoPacote(active.loteVenda);
        setCotacao(active.gcPorMoeda);
      }
    };
    sync();
    setHistory(StorageService.get<QuoteSnapshot[]>("rc_history", []));
    window.addEventListener("reinahub:quote-change", sync);
    return () => window.removeEventListener("reinahub:quote-change", sync);
  }, []);

  const calc = useMemo(() => {
    const lote = server?.lote ?? 25;
    const normalizedQuantidade = Math.max(lote, Math.floor(quantidade / lote) * lote);
    const precoMoeda = lote > 0 ? precoPacote / lote : 0;
    const precoGc = cotacao > 0 ? precoMoeda / cotacao : 0;
    const goldDisponivel = parseGoldInput(gold);
    const mochila = parseGoldInput(goldMochila);
    const banco = parseGoldInput(goldBanco);
    const moedasPossiveisExatas = cotacao > 0 ? goldDisponivel / cotacao : 0;
    const rcPossiveis = cotacao > 0 ? Math.floor(goldDisponivel / cotacao / lote) * lote : 0;
    return {
      lote,
      normalizedQuantidade,
      precoMoeda,
      precoGc,
      totalGold: normalizedQuantidade * cotacao,
      valorTotal: normalizedQuantidade * precoMoeda,
      moedasPossiveisExatas,
      rcPossiveis,
      valorPossivel: rcPossiveis * precoMoeda,
      preco1Gc: precoGc,
      preco100Gc: precoGc * 100,
      preco1K: precoGc * 1000,
      preco10K: precoGc * 10000,
      preco100K: precoGc * 100000,
      precoKk: precoGc * 1000000,
      preco100Kk: precoGc * 100000000,
      patrimonio: (mochila + banco) * precoGc
    };
  }, [precoPacote, quantidade, cotacao, gold, goldMochila, goldBanco, server?.lote]);

  const currencyName = server?.moeda ?? "moeda premium";
  const loteBase = server?.lote ?? 25;

  function saveHistory() {
    const next = [
      ...history,
      {
        ts: Date.now(),
        nome: server?.nome ?? "Cotacao manual",
        moeda: server?.moeda ?? "RC",
        gcPorMoeda: cotacao,
        unitVenda: precoPacote / (server?.lote ?? 25),
        unitCompra: precoPacote / (server?.lote ?? 25)
      }
    ].slice(-30);
    setHistory(next);
    StorageService.set("rc_history", next);
  }

  return (
    <AppShell current="rc" mark="RC" subtitle="Calculadora RC - moeda - gold">
      <ActiveServerBanner />
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { key: "calculadora", label: "I - Calculadora" },
          { key: "mercado", label: "II - Mercado" },
          { key: "patrimonio", label: "III - Patrimonio" }
        ]}
      />

      {tab === "calculadora" ? (
        <>
          <Panel title="Parametros base" eyebrow="preenchidos pela Cotacao Central">
            <div className="inputs-grid" style={{ alignItems: "end" }}>
              <Field label={`Preco do lote base (${loteBase} ${currencyName})`}>
                <div className="field-wrap"><span className="field-prefix">R$</span><input className="with-prefix" type="number" step="0.000001" value={precoPacote} onChange={(e) => setPrecoPacote(Number(e.target.value))} /></div>
              </Field>
              <Field label={`Quantidade de ${currencyName} (multiplos de ${loteBase})`}>
                <input type="number" step={loteBase} value={quantidade} onChange={(e) => setQuantidade(Number(e.target.value))} />
              </Field>
              <Field label="Cotacao (GC por moeda)">
                <input type="number" value={cotacao} onChange={(e) => setCotacao(Number(e.target.value))} />
              </Field>
              <Field label="GC disponivel">
                <input inputMode="numeric" value={gold} onChange={(e) => setGold(sanitizeGoldInput(e.target.value))} placeholder="100000000" />
              </Field>
            </div>
            <div className="quick-row">
              {buildCurrencyQuickAmounts(loteBase).map((amount) => (
                <button className="quick-btn" key={amount} type="button" onClick={() => setQuantidade(amount)}>{amount}</button>
              ))}
            </div>
            <p className="note">
              Para {currencyName}, a negociacao usa lote base de {loteBase} e seus multiplos. Se informar outro numero, o calculo considera o multiplo valido abaixo.
            </p>
          </Panel>
          <div className="slots">
            <ResultSlot label="Quantidade calculada" value={`${integer(calc.normalizedQuantidade)} ${server?.moeda ?? ""}`} />
            <ResultSlot label="Preco de 1 moeda" value={`R$ ${moneySmart(calc.precoMoeda)}`} tone="small" />
            <ResultSlot label="Valor total informado" value={`R$ ${moneySmart(calc.valorTotal)}`} tone="gold" />
            <ResultSlot label="Total de GC equivalente" value={`${integer(calc.totalGold)} gc`} />
            <ResultSlot label="Moeda premium exata com seu GC" value={moneySmart(calc.moedasPossiveisExatas, 8)} />
            <ResultSlot label="Moedas em multiplos do lote" value={integer(calc.rcPossiveis)} />
            <ResultSlot label="Valor possivel em reais" value={`R$ ${moneySmart(calc.valorPossivel)}`} tone="gold" />
            <ResultSlot label="Preco de 1 GC" value={`R$ ${moneySmart(calc.preco1Gc, 10)}`} />
            <ResultSlot label="Preco de 100 GC" value={`R$ ${moneySmart(calc.preco100Gc, 10)}`} />
            <ResultSlot label="Preco de 1K GC" value={`R$ ${moneySmart(calc.preco1K, 10)}`} />
            <ResultSlot label="Preco de 10K GC" value={`R$ ${moneySmart(calc.preco10K, 10)}`} />
            <ResultSlot label="Preco de 100K GC" value={`R$ ${moneySmart(calc.preco100K, 10)}`} />
            <ResultSlot label="Preco de 1KK" value={`R$ ${moneySmart(calc.precoKk, 10)}`} />
            <ResultSlot label="Preco de 100 KK" value={`R$ ${moneySmart(calc.preco100Kk)}`} tone="gold" />
          </div>
        </>
      ) : null}

      {tab === "mercado" ? (
        <Panel title="Cotas de mercado" eyebrow="compra vs venda">
          <div className="market-grid">
            <div className="market-card"><div className="label">Servidor ativo</div><div className="value gold">{server ? getServerDisplayName(server) : "-"}</div></div>
            <div className="market-card"><div className="label">Lote base</div><div className="value">{server?.lote ?? 25} {server?.moeda ?? ""}</div></div>
            <div className="market-card"><div className="label">Preco unitario venda</div><div className="value">R$ {moneySmart((server?.loteVenda ?? precoPacote) / (server?.lote ?? 25))}</div></div>
            <div className="market-card"><div className="label">Preco unitario compra</div><div className="value red">R$ {moneySmart((server?.loteCompra ?? precoPacote) / (server?.lote ?? 25))}</div></div>
            <div className="market-card"><div className="label">Spread</div><div className="value gold">R$ {moneySmart(((server?.loteCompra ?? precoPacote) - (server?.loteVenda ?? precoPacote)) / (server?.lote ?? 25))}</div></div>
          </div>
        </Panel>
      ) : null}

      {tab === "patrimonio" ? (
        <>
          <Panel title="Seu patrimonio no jogo" eyebrow="avaliacao em reais">
            <div className="inputs-grid">
              <Field label="Gold na mochila"><input inputMode="numeric" value={goldMochila} onChange={(e) => setGoldMochila(sanitizeGoldInput(e.target.value))} /></Field>
              <Field label="Gold no banco"><input inputMode="numeric" value={goldBanco} onChange={(e) => setGoldBanco(sanitizeGoldInput(e.target.value))} /></Field>
            </div>
          </Panel>
          <div className="verdict">
            <div className="label">Valor estimado do personagem</div>
            <div className="value gold">R$ {moneySmart(calc.patrimonio, 10)}</div>
          </div>
          <Panel title="Historico de cotacoes" eyebrow="salvo localmente">
            <div className="quick-row" style={{ marginBottom: 16 }}>
              <button className="quick-btn primary" type="button" onClick={saveHistory}>Salvar cotacao atual</button>
              <button className="quick-btn danger" type="button" onClick={() => { setHistory([]); StorageService.remove("rc_history"); }}>Limpar historico</button>
            </div>
            <div className="history-list">
              {history.length ? history.slice().reverse().map((entry) => (
                <div className="history-item" key={entry.ts}><span>{new Date(entry.ts).toLocaleString("pt-BR")}</span><span>{integer(entry.gcPorMoeda)} gc/{entry.moeda} - R$ {moneySmart(entry.unitVenda * (server?.lote ?? 25))}</span></div>
              )) : <div className="empty-msg">Nenhuma cotacao salva ainda.</div>}
            </div>
          </Panel>
        </>
      ) : null}
    </AppShell>
  );
}

function sanitizeGoldInput(value: string) {
  return value.replace(/[^\d]/g, "");
}

function parseGoldInput(value: string) {
  return Number(value || 0);
}

function buildCurrencyQuickAmounts(lote: number) {
  return [1, 2, 3, 4, 10, 20, 40].map((multiplier) => multiplier * lote);
}
