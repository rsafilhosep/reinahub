"use client";

import { Calculator, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { currencyShortName, integer, moneySmart, parseGameNumber } from "@/services/format";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";

type ConverterMode = "gold" | "premium" | "brl";

const modeLabels: Record<ConverterMode, string> = {
  gold: "GC",
  premium: "Moeda premium",
  brl: "R$"
};

export function QuickEconomyConverter() {
  const [open, setOpen] = useState(false);
  const [economy, setEconomy] = useState<ReinaEconomyContext | null>(null);
  const [mode, setMode] = useState<ConverterMode>("gold");
  const [rawValue, setRawValue] = useState("2700");

  useEffect(() => {
    const sync = () => setEconomy(ReinaEconomyService.getActiveContext());
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  const premiumName = currencyShortName(economy?.currencyName) || "MP";
  const results = useMemo(() => calculateResults(economy, mode, rawValue), [economy, mode, rawValue]);

  return (
    <>
      <button className="quick-converter-trigger" type="button" onClick={() => setOpen(true)}>
        <Calculator size={16} aria-hidden="true" />
        <span>Conversor rapido</span>
      </button>

      <Modal title="Conversor rapido" eyebrow={economy?.serverName ?? "Cotacao ativa"} open={open} onClose={() => setOpen(false)}>
        <div className="quick-converter">
          <div className="quick-converter-mode-row" role="tablist" aria-label="Tipo de entrada">
            {(["gold", "premium", "brl"] as ConverterMode[]).map((nextMode) => (
              <button
                className={`quick-btn${mode === nextMode ? " primary" : ""}`}
                key={nextMode}
                type="button"
                onClick={() => setMode(nextMode)}
              >
                {nextMode === "premium" ? premiumName : modeLabels[nextMode]}
              </button>
            ))}
          </div>

          <label className="quick-converter-input">
            <span>
              Valor em {mode === "premium" ? premiumName : modeLabels[mode]}
              <small>Serve para total, por hora ou meta parcial.</small>
            </span>
            <input
              inputMode="decimal"
              value={rawValue}
              placeholder={mode === "gold" ? "Ex: 2.700" : mode === "brl" ? "Ex: 25,00" : "Ex: 250"}
              onChange={(event) => setRawValue(event.target.value)}
            />
          </label>

          <div className="quick-converter-results">
            <div className="slot">
              <div className="label">Gold Coins</div>
              <div className="value gold">{integer(results.gold)} GC</div>
            </div>
            <div className="slot">
              <div className="label">{premiumName}</div>
              <div className="value">{moneySmart(results.premium, 6)} {premiumName}</div>
            </div>
            <div className="slot">
              <div className="label">Se vender</div>
              <div className="value">R$ {moneySmart(results.sellBrl, 6)}</div>
            </div>
            <div className="slot">
              <div className="label">Para comprar</div>
              <div className="value red">R$ {moneySmart(results.buyBrl, 6)}</div>
            </div>
          </div>

          <div className="quick-converter-note">
            <span>
              Base ativa: <strong>{economy?.platformName ?? "-"} - {economy?.worldName ?? "-"}</strong>
            </span>
            <span>
              1 {premiumName} = {integer(economy?.goldPerPremium ?? 0)} GC
            </span>
          </div>

          <div className="quick-row">
            <button className="quick-btn" type="button" onClick={() => setRawValue(mode === "gold" ? "2700" : "0")}>
              <RotateCcw size={14} aria-hidden="true" /> Resetar exemplo
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function calculateResults(economy: ReinaEconomyContext | null, mode: ConverterMode, rawValue: string) {
  const server = economy?.server ?? null;
  const value = mode === "gold" ? parseGameNumber(rawValue) : parseFlexibleDecimal(rawValue);

  const gold =
    mode === "gold"
      ? value
      : mode === "premium"
        ? ReinaEconomyService.premiumToGold(server, value)
        : ReinaEconomyService.brlToGold(server, value, "compra");

  const premium =
    mode === "premium"
      ? value
      : mode === "brl"
        ? ReinaEconomyService.brlToPremium(server, value, "compra")
        : ReinaEconomyService.goldToPremium(server, gold);

  return {
    gold,
    premium,
    sellBrl: ReinaEconomyService.premiumToBrl(server, premium, "venda"),
    buyBrl: ReinaEconomyService.premiumToBrl(server, premium, "compra")
  };
}

function parseFlexibleDecimal(value: string) {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned) return 0;

  if (cleaned.includes(",") && cleaned.includes(".")) {
    return Number(cleaned.replace(/\./g, "").replace(",", ".")) || 0;
  }

  if (cleaned.includes(",")) {
    return Number(cleaned.replace(",", ".")) || 0;
  }

  if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, "")) || 0;
  }

  return Number(cleaned) || 0;
}
