"use client";

import { useEffect, useMemo, useState } from "react";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { integer, moneySmart } from "@/services/format";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import { GoalProgressEstimatorService } from "../services/goal-progress-estimator-service";
import { PremiumGoalsService } from "../services/premium-goals-service";

export function PremiumGoalsPage() {
  const products = PremiumGoalsService.listProducts();
  const [server, setServer] = useState<VaultServer | null>(null);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [ownedPremium, setOwnedPremium] = useState(0);
  const [overrideCost, setOverrideCost] = useState(0);

  useEffect(() => {
    const sync = () => {
      const context = ReinaActiveContextService.getActiveContext();
      setServer(context.server);
      setOwnedPremium(PremiumGoalsService.getProgress(productId)?.ownedPremium ?? 0);
    };
    sync();
    return ReinaActiveContextService.subscribe(sync);
  }, [productId]);

  const product = PremiumGoalsService.getProduct(productId);
  const override = product && server ? PremiumGoalsService.getOverride(product.id, server.id) : null;
  const costInUse = override?.cost ?? product?.defaultCost ?? 0;
  const calculation = useMemo(() => PremiumGoalsService.calculate(productId, server, ownedPremium), [productId, server, ownedPremium, costInUse]);
  const estimate = useMemo(() => GoalProgressEstimatorService.estimatePremiumGoal(calculation, server), [calculation, server]);

  useEffect(() => {
    setOverrideCost(costInUse);
  }, [productId, server?.id, costInUse]);

  function saveOverride() {
    if (!server || !product) return;
    PremiumGoalsService.saveOverride(product.id, server.id, overrideCost);
    PremiumGoalsService.saveProgress(product.id, ownedPremium);
    window.dispatchEvent(new Event("storage"));
  }

  function saveProgress() {
    if (!product) return;
    PremiumGoalsService.saveProgress(product.id, ownedPremium);
    window.dispatchEvent(new Event("storage"));
  }

  function removeOverride() {
    if (!server || !product) return;
    PremiumGoalsService.removeOverride(product.id, server.id);
    setOverrideCost(product.defaultCost);
    window.dispatchEvent(new Event("storage"));
  }

  return (
    <>
      <Panel title="Objetivo premium" eyebrow="produto - servidor - progresso">
        <div className="inputs-grid">
          <Field label="Produto">
            <select value={productId} onChange={(event) => setProductId(event.target.value)}>
              {products.map((item) => (
                <option value={item.id} key={item.id}>{item.name}</option>
              ))}
            </select>
          </Field>
          <Field label={`Quanto voce ja tem (${server?.moeda ?? "moeda premium"})`}>
            <input type="number" value={ownedPremium} onChange={(event) => setOwnedPremium(Number(event.target.value))} />
          </Field>
          <Field label={`Preco neste servidor (${server?.moeda ?? "moeda premium"})`}>
            <input type="number" value={overrideCost} onChange={(event) => setOverrideCost(Number(event.target.value))} />
          </Field>
        </div>
        <div className="quick-row">
          <button className="quick-btn primary" type="button" onClick={saveOverride} disabled={!server || !product}>Salvar preco do servidor</button>
          <button className="quick-btn" type="button" onClick={saveProgress} disabled={!product}>Salvar progresso</button>
          <button className="quick-btn" type="button" onClick={removeOverride} disabled={!server || !product || !override}>Usar preco padrao</button>
        </div>
        <p className="note">
          O preco padrao usa a moeda premium do servidor ativo. Se um OTServer tiver valor diferente, salve um preco especifico para esse servidor.
        </p>
      </Panel>

      {calculation ? (
        <>
          <div className="verdict">
            <div className="label">Objetivo ativo</div>
            <div className="value gold">{calculation.product.name}</div>
            <div className="note">
              {ReinaEconomyService.getDisplayName(server)} - custa {integer(calculation.cost)} {calculation.currencyName}
              {override ? " neste servidor" : " pelo padrao do catalogo"}
            </div>
          </div>

          <div className="slots">
            <ResultSlot label="Custo total" value={`${integer(calculation.cost)} ${calculation.currencyName}`} tone="gold" />
            <ResultSlot label="Voce ja tem" value={`${integer(calculation.ownedPremium)} ${calculation.currencyName}`} />
            <ResultSlot label="Falta" value={`${integer(calculation.missingPremium)} ${calculation.currencyName}`} tone="gold" />
            <ResultSlot label="Gold necessario" value={`${integer(calculation.missingGold)} gold`} />
            <ResultSlot label="Valor para vender" value={`R$ ${moneySmart(calculation.missingBrlVenda)}`} tone="red" />
            <ResultSlot label="Custo para comprar" value={`R$ ${moneySmart(calculation.missingBrlCompra)}`} />
          </div>

          <Panel title="Estimativa por hunt" eyebrow="historico do contexto ativo">
            {estimate && estimate.huntsUsed > 0 ? (
              <>
                <div className="hero-grid">
                  <ResultSlot label="Media por hunt" value={`${integer(estimate.averageBalance)} gp`} tone="gold" />
                  <ResultSlot label="Media por hora" value={`${integer(estimate.averageBalancePerHour)} gp/h`} />
                  <ResultSlot label="Horas ate a meta" value={estimate.estimatedHours !== null ? formatHours(estimate.estimatedHours) : "-"} tone="gold" />
                  <ResultSlot label="Hunts estimadas" value={estimate.estimatedSessions !== null ? `${integer(estimate.estimatedSessions)} hunts` : "-"} />
                  <ResultSlot label="Dias a 3h/dia" value={estimate.estimatedDaysAtThreeHours !== null ? `${integer(estimate.estimatedDaysAtThreeHours)} dias` : "-"} />
                  <ResultSlot label="Base da media" value={`${estimate.huntsUsed}/${estimate.sampleSize} hunts`} />
                </div>
                <p className="note">
                  Com a media das {estimate.sourceLabel}, faltam aproximadamente {estimate.estimatedHours !== null ? formatHours(estimate.estimatedHours) : "-"} para completar {calculation.product.name}.
                </p>
              </>
            ) : (
              <div className="empty-msg">
                Importe hunts no Hunt Analyzer neste perfil/personagem para estimar quantas horas faltam ate a meta.
              </div>
            )}
          </Panel>
        </>
      ) : (
        <Panel title="Configure a cotacao" eyebrow="servidor ativo">
          <div className="empty-msg">Cadastre ou selecione um servidor na Cotacao Central.</div>
        </Panel>
      )}

      <Panel title="Catalogo preparado" eyebrow="valores revisaveis">
        <div className="history-list">
          {products.map((item) => (
            <div className="history-item" key={item.id}>
              <span>
                {item.name}
                <span className="note" style={{ marginLeft: 10 }}>{item.category} - {item.availability}</span>
              </span>
              <span style={{ color: "var(--gold)" }}>{integer(item.defaultCost)} moeda premium</span>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value < 1) return `${Math.ceil(value * 60)} min`;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}
