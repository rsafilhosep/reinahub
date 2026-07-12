"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { HelpTip, HelpToggle } from "@/components/Help";
import { Modal } from "@/components/Modal";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { Tabs } from "@/components/Tabs";
import { integer, moneySmart } from "@/services/format";
import { StorageService } from "@/services/storage-service";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { RcCalculatorService } from "@/source/web/src/features/rc-calculator/services/rc-calculator-service";
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
  const [quickConverterOpen, setQuickConverterOpen] = useState(false);
  const [quickConverterMode, setQuickConverterMode] = useState<"gold" | "brl" | "premium">("gold");
  const [quickConverterValue, setQuickConverterValue] = useState("1000000");

  useEffect(() => {
    const sync = () => {
      const active = ReinaEconomyService.getActiveContext().server;
      setServer(active);
      if (active) {
        setPrecoPacote(active.loteVenda);
        setCotacao(active.gcPorMoeda);
      }
    };
    sync();
    setHistory(StorageService.get<QuoteSnapshot[]>("rc_history", []));
    return ReinaEconomyService.subscribe(sync);
  }, []);

  const calc = useMemo(() => {
    const lote = server?.lote ?? 25;
    return RcCalculatorService.calculate({
      lote,
      precoPacote,
      quantidade,
      cotacao,
      goldDisponivel: RcCalculatorService.parseGoldInput(gold),
      goldMochila: RcCalculatorService.parseGoldInput(goldMochila),
      goldBanco: RcCalculatorService.parseGoldInput(goldBanco)
    });
  }, [precoPacote, quantidade, cotacao, gold, goldMochila, goldBanco, server?.lote]);

  const currencyName = server?.moeda ?? "moeda premium";
  const loteBase = server?.lote ?? 25;
  const quickConversion = useMemo(
    () => convertQuickValue(quickConverterMode, quickConverterValue, cotacao, precoPacote / loteBase),
    [quickConverterMode, quickConverterValue, cotacao, precoPacote, loteBase]
  );

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
    <AppShell current="rc" mark="RC" subtitle="Calculadora RC - moeda premium - gold">
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
            <div className="help-panel-row">
              <p className="note">
                Estes campos usam a Cotacao Central como referencia para converter gold, moeda premium e reais.
              </p>
              <HelpToggle />
            </div>
            <div className="inputs-grid" style={{ alignItems: "end" }}>
              <Field label={<HelpLabel text={`Preco em R$ do lote (${loteBase} ${currencyName})`} help={`Valor em reais do lote inteiro de ${loteBase} ${currencyName}. Ele vem da Cotacao Central, mas pode ser ajustado aqui para simular.`} />}>
                <div className="field-wrap"><span className="field-prefix">R$</span><input className="with-prefix" type="number" step="0.000001" value={precoPacote} onChange={(e) => setPrecoPacote(Number(e.target.value))} /></div>
              </Field>
              <Field label={<HelpLabel text={`${currencyName} desejadas (multiplos de ${loteBase})`} help={`Quantidade de moeda premium que voce quer simular. Se digitar um valor fora do lote, o ReinaHub usa o multiplo valido abaixo.`} />}>
                <IntegerInput value={quantidade} onChange={setQuantidade} />
              </Field>
              <Field label={<HelpLabel text={`Gold por 1 ${currencyName}`} help={`Quanto gold custa 1 ${currencyName}. Exemplo: 40000 significa 40.000 gold para comprar 1 ${currencyName}.`} />}>
                <IntegerInput value={cotacao} onChange={setCotacao} />
              </Field>
              <Field label={<HelpLabel text="Gold disponivel" help={`Gold coins que voce tem disponivel. O ReinaHub calcula quantas ${currencyName} isso compra e quanto vale em reais.`} />}>
                <input inputMode="numeric" value={formatIntegerString(gold)} onChange={(e) => setGold(RcCalculatorService.sanitizeGoldInput(e.target.value))} placeholder="100.000.000" />
              </Field>
            </div>
            <div className="quick-row">
              {RcCalculatorService.buildCurrencyQuickAmounts(loteBase).map((amount) => (
                <button className="quick-btn" key={amount} type="button" onClick={() => setQuantidade(amount)}>{amount}</button>
              ))}
            </div>
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={() => setQuickConverterOpen(true)}>Abrir conversor rapido</button>
            </div>
            <p className="note">
              Para {currencyName}, a negociacao usa lote base de {loteBase} e seus multiplos. Se informar outro numero, o calculo usa o multiplo valido abaixo.
            </p>
          </Panel>
          <div className="slots">
            <ResultSlot label={`${currencyName} calculadas`} value={`${integer(calc.normalizedQuantidade)} ${server?.moeda ?? ""}`} />
            <ResultSlot label={`Preco de 1 ${currencyName}`} value={<MoneyValue value={calc.precoMoeda} />} tone="small" />
            <ResultSlot label="Valor total em R$" value={<MoneyValue value={calc.valorTotal} />} tone="gold" />
            <ResultSlot label="Gold necessario" value={`${integer(calc.totalGold)} gold`} />
            <ResultSlot label={<HelpLabel text={`${currencyName} possiveis (exato)`} help="Resultado fracionado. Ele mostra a conversao matematica exata do seu gold, mesmo que o jogo negocie apenas lotes inteiros." />} value={moneySmart(calc.moedasPossiveisExatas, 8)} />
            <ResultSlot label={`${currencyName} compraveis em lote`} value={integer(calc.rcPossiveis)} />
            <ResultSlot label="Valor possivel em reais" value={<MoneyValue value={calc.valorPossivel} />} tone="gold" />
            <ResultSlot label="Valor de 1 gold" value={<MoneyValue value={calc.preco1Gc} maxDecimals={10} />} />
            <ResultSlot label="Valor de 100 gold" value={<MoneyValue value={calc.preco100Gc} maxDecimals={10} />} />
            <ResultSlot label="Valor de 1K gold" value={<MoneyValue value={calc.preco1K} maxDecimals={10} />} />
            <ResultSlot label="Valor de 10K gold" value={<MoneyValue value={calc.preco10K} maxDecimals={10} />} />
            <ResultSlot label="Valor de 100K gold" value={<MoneyValue value={calc.preco100K} maxDecimals={10} />} />
            <ResultSlot label="Valor de 1KK gold" value={<MoneyValue value={calc.precoKk} maxDecimals={10} />} />
            <ResultSlot label={<HelpLabel text="Valor de 100KK gold" help="100KK significa 100.000.000 gold coins convertidos para reais pela cotacao ativa." />} value={<MoneyValue value={calc.preco100Kk} />} tone="gold" />
          </div>

          <Modal title="Conversor rapido" eyebrow={server ? ReinaEconomyService.getDisplayName(server) : "cotacao manual"} open={quickConverterOpen} onClose={() => setQuickConverterOpen(false)}>
            <div className="converter-overlay-grid">
              <div className="converter-mode-row">
                {[
                  { key: "gold", label: "Digitar gold" },
                  { key: "brl", label: "Digitar R$" },
                  { key: "premium", label: `Digitar ${currencyName}` }
                ].map((mode) => (
                  <button
                    className={`quick-btn${quickConverterMode === mode.key ? " primary" : ""}`}
                    key={mode.key}
                    type="button"
                    onClick={() => {
                      setQuickConverterMode(mode.key as "gold" | "brl" | "premium");
                      setQuickConverterValue("");
                    }}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              <Field label={getQuickConverterLabel(quickConverterMode, currencyName)}>
                <input
                  inputMode="decimal"
                  value={quickConverterMode === "gold" ? formatIntegerString(quickConverterValue) : quickConverterValue}
                  onChange={(event) => setQuickConverterValue(quickConverterMode === "gold" ? RcCalculatorService.sanitizeGoldInput(event.target.value) : event.target.value)}
                  placeholder={quickConverterMode === "gold" ? "1.000.000" : "0,00"}
                />
              </Field>
              <div className="slots">
                <ResultSlot label="Gold Coins" value={`${integer(quickConversion.gold)} gold`} tone="gold" />
                <ResultSlot label={currencyName} value={moneySmart(quickConversion.premium, 8)} />
                <ResultSlot label="Valor em reais" value={<MoneyValue value={quickConversion.brl} />} tone="gold" />
              </div>
              <p className="note">
                Conversao rapida usando {integer(cotacao)} gold por 1 {currencyName} e R$ {moneySmart(precoPacote / loteBase)} por {currencyName}.
              </p>
            </div>
          </Modal>
        </>
      ) : null}

      {tab === "mercado" ? (
        <Panel title="Cotas de mercado" eyebrow="compra vs venda">
          <div className="market-grid">
            <div className="market-card"><div className="label">Servidor ativo</div><div className="value gold">{ReinaEconomyService.getDisplayName(server)}</div></div>
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
              <Field label={<HelpLabel text="Gold na mochila" help="Gold que esta carregado no personagem. Soma com o banco para estimar o patrimonio total." />}><input inputMode="numeric" value={formatIntegerString(goldMochila)} onChange={(e) => setGoldMochila(RcCalculatorService.sanitizeGoldInput(e.target.value))} /></Field>
              <Field label={<HelpLabel text="Gold no banco" help="Gold guardado no banco. O valor estimado usa o preco de 1 GC calculado pela cotacao ativa." />}><input inputMode="numeric" value={formatIntegerString(goldBanco)} onChange={(e) => setGoldBanco(RcCalculatorService.sanitizeGoldInput(e.target.value))} /></Field>
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

function HelpLabel({ text, help }: { text: string; help: string }) {
  return (
    <span className="help-label">
      <span>{text}</span>
      <HelpTip text={help} />
    </span>
  );
}

function MoneyValue({ value, maxDecimals = 8 }: { value: number; maxDecimals?: number }) {
  return (
    <span className="inline-money">
      <span>R$</span>
      <span>{moneySmart(value, maxDecimals)}</span>
    </span>
  );
}

function IntegerInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <input
      inputMode="numeric"
      value={integer(value)}
      onChange={(event) => onChange(parseIntegerInput(event.target.value))}
    />
  );
}

function formatIntegerString(value: string) {
  const digits = RcCalculatorService.sanitizeGoldInput(value);
  if (!digits) return "";
  return integer(Number(digits));
}

function parseIntegerInput(value: string) {
  const digits = RcCalculatorService.sanitizeGoldInput(value);
  return digits ? Number(digits) : 0;
}

function parseDecimalInput(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function convertQuickValue(
  mode: "gold" | "brl" | "premium",
  rawValue: string,
  goldPerPremium: number,
  brlPerPremium: number
) {
  const safeGoldPerPremium = Math.max(0, Number(goldPerPremium) || 0);
  const safeBrlPerPremium = Math.max(0, Number(brlPerPremium) || 0);
  const value = mode === "gold" ? parseIntegerInput(rawValue) : parseDecimalInput(rawValue);

  if (mode === "gold") {
    const premium = safeGoldPerPremium > 0 ? value / safeGoldPerPremium : 0;
    return {
      gold: value,
      premium,
      brl: premium * safeBrlPerPremium
    };
  }

  if (mode === "brl") {
    const premium = safeBrlPerPremium > 0 ? value / safeBrlPerPremium : 0;
    return {
      gold: premium * safeGoldPerPremium,
      premium,
      brl: value
    };
  }

  return {
    gold: value * safeGoldPerPremium,
    premium: value,
    brl: value * safeBrlPerPremium
  };
}

function getQuickConverterLabel(mode: "gold" | "brl" | "premium", currencyName: string) {
  if (mode === "gold") return "Valor em gold";
  if (mode === "brl") return "Valor em reais";
  return `Valor em ${currencyName}`;
}
