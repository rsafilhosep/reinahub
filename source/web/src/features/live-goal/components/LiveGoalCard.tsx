"use client";

import { ModuleIcon } from "@/components/ModuleIcon";
import { integer, moneySmart } from "@/services/format";
import { getMonsterImagePath, MISSING_CREATURE_IMAGE } from "@/source/web/src/reina-core/assets";
import type { LiveGoalCalculation } from "../types/live-goal.types";
import { ProgressBar } from "./ProgressBar";

export function LiveGoalCard({
  calculation,
  overlay = false
}: {
  calculation: LiveGoalCalculation;
  overlay?: boolean;
}) {
  const { goal } = calculation;
  const unitLabel = calculation.unitLabel;
  const imageUrl = goal.imageUrl || (calculation.isKillGoal ? getMonsterImagePath(goal.itemName) : "");

  return (
    <section className={`live-goal-card theme-${goal.theme}${overlay ? " is-overlay" : ""}${calculation.isKillGoal ? " is-kill-goal" : ""}${calculation.creatureGoal || calculation.bestiarySlots.length ? " has-creature-goal" : ""}`}>
      <div className="live-goal-frame" />
      <div className="live-goal-head">
        <div>
          <div className="eyebrow">Objetivo da live</div>
          <h2>{goal.itemName}</h2>
          <p>{calculation.isKillGoal ? `${calculation.serverName} - meta de criatura` : calculation.serverName}</p>
        </div>
        <div className="live-goal-avatar">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              onError={(event) => {
                if (event.currentTarget.src.endsWith(MISSING_CREATURE_IMAGE)) return;
                event.currentTarget.src = MISSING_CREATURE_IMAGE;
              }}
            />
          ) : (
            <ModuleIcon moduleKey="live-goal" size={54} />
          )}
        </div>
      </div>

      <div className="live-goal-main-number">
        <span>{formatValue(calculation.current)}</span>
        <span className="live-goal-divider">/</span>
        <span>{formatValue(calculation.total)} {unitLabel}</span>
      </div>

      <ProgressBar value={calculation.progressPct} />

      <div className="live-goal-percent">{formatPercent(calculation.progressPct)}% concluido</div>

      <div className="live-goal-stats">
        <div>
          <span>Falta</span>
          <strong>{formatValue(calculation.missing)} {unitLabel}</strong>
        </div>
        {goal.showGold && !calculation.isKillGoal ? (
          <div>
            <span>Equivalente em gold</span>
            <strong>{integer(calculation.totalGold)} gold</strong>
          </div>
        ) : null}
        {goal.showBrl && !calculation.isKillGoal ? (
          <div>
            <span>Equivalente em R$</span>
            <strong>R$ {moneySmart(calculation.totalBrlVenda)}</strong>
          </div>
        ) : null}
      </div>

      {calculation.creatureGoal ? (
        <div className="live-goal-creature-card">
          <div className="live-goal-creature-avatar">
            <img
              src={calculation.creatureGoal.imageUrl || getMonsterImagePath(calculation.creatureGoal.name)}
              alt=""
              onError={(event) => {
                if (event.currentTarget.src.endsWith(MISSING_CREATURE_IMAGE)) return;
                event.currentTarget.src = MISSING_CREATURE_IMAGE;
              }}
            />
          </div>
          <div className="live-goal-creature-info">
            <span className="eyebrow">Meta de criatura</span>
            <strong>{calculation.creatureGoal.name}</strong>
            <div className="live-goal-creature-number">
              {formatValue(calculation.creatureGoal.current)} / {formatValue(calculation.creatureGoal.total)} kills
            </div>
            <ProgressBar value={calculation.creatureGoal.progressPct} />
            <small>{formatPercent(calculation.creatureGoal.progressPct)}% concluido - faltam {formatValue(calculation.creatureGoal.missing)}</small>
          </div>
        </div>
      ) : null}

      {calculation.bestiarySlots.length ? (
        <div className="live-goal-bestiary-card">
          <div className="eyebrow">Bestiarios da live</div>
          <div className="live-goal-bestiary-grid">
            {calculation.bestiarySlots.map((slot) => (
              <div className="live-goal-creature-card is-compact" key={slot.name}>
                <div className="live-goal-creature-avatar">
                  <img
                    src={slot.imageUrl || getMonsterImagePath(slot.name)}
                    alt=""
                    onError={(event) => {
                      if (event.currentTarget.src.endsWith(MISSING_CREATURE_IMAGE)) return;
                      event.currentTarget.src = MISSING_CREATURE_IMAGE;
                    }}
                  />
                </div>
                <div className="live-goal-creature-info">
                  <strong>{slot.name}</strong>
                  <div className="live-goal-creature-number">
                    {formatValue(slot.current)} / {formatValue(slot.total)} kills
                  </div>
                  <ProgressBar value={slot.progressPct} />
                  <small>{formatPercent(slot.progressPct)}% - faltam {formatValue(slot.missing)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {goal.customText ? <p className="live-goal-message">{goal.customText}</p> : null}
    </section>
  );
}

function formatValue(value: number) {
  return Number.isInteger(value) ? integer(value) : moneySmart(value, 2);
}

function formatPercent(value: number) {
  if (!Number.isFinite(value)) return "0,0";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  });
}
