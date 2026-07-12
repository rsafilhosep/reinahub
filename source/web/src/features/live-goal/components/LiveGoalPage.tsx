"use client";

import { ExternalLink, Plus, RotateCcw, Save, Share2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Field, Panel } from "@/components/Panel";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import type { VaultServer } from "@/types/vault";
import { LiveGoalService } from "../services/live-goal-service";
import type { LiveGoal } from "../types/live-goal.types";
import { LiveGoalCard } from "./LiveGoalCard";
import { LiveGoalForm } from "./LiveGoalForm";

export function LiveGoalPage() {
  const [server, setServer] = useState<VaultServer | null>(null);
  const [goal, setGoal] = useState<LiveGoal | null>(null);
  const [addAmount, setAddAmount] = useState(25);
  const [creatureAddAmount, setCreatureAddAmount] = useState(1);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const sync = () => {
      setServer(ReinaActiveContextService.getActiveContext().server);
      setGoal(LiveGoalService.getActiveGoal());
    };
    sync();
    window.addEventListener("reinahub:live-goal-change", sync);
    const unsubscribe = ReinaActiveContextService.subscribe(sync);
    return () => {
      window.removeEventListener("reinahub:live-goal-change", sync);
      unsubscribe();
    };
  }, []);

  const calculation = useMemo(() => goal ? LiveGoalService.calculate(goal, server) : null, [goal, server]);

  function saveGoal(nextGoal = goal) {
    if (!nextGoal) return;
    const saved = LiveGoalService.saveGoal(nextGoal);
    setGoal(saved);
    setMessage("Objetivo salvo.");
  }

  function resetProgress() {
    if (!goal) return;
    setGoal(LiveGoalService.resetProgress(goal));
    setMessage("Progresso resetado.");
  }

  function addProgress() {
    if (!goal) return;
    setGoal(LiveGoalService.addProgress(goal, addAmount));
    setMessage("Progresso atualizado.");
  }

  function addCreatureProgress() {
    if (!goal) return;
    setGoal(LiveGoalService.addCreatureProgress(goal, creatureAddAmount));
    setMessage("Progresso da criatura atualizado.");
  }

  function getOverlayUrl() {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/overlay-goal?${LiveGoalService.toOverlayParams(goal as LiveGoal, server)}`;
  }

  function openOverlay() {
    if (!goal) return;
    window.open(getOverlayUrl(), "_blank", "noopener,noreferrer");
  }

  async function copyOverlayLink() {
    if (!goal) return;
    const url = getOverlayUrl();
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Link do overlay copiado.");
    } catch {
      setMessage(url);
    }
  }

  if (!goal || !calculation) {
    return (
      <Panel title="Live Goal" eyebrow="carregando">
        <div className="empty-msg">Carregando objetivo...</div>
      </Panel>
    );
  }

  return (
    <>
      <LiveGoalForm goal={goal} server={server} onChange={(nextGoal) => setGoal(nextGoal)} />

      <Panel title="Controles da live" eyebrow="obs - tiktok - youtube">
        <div className="live-goal-actions">
          <button className="quick-btn primary" type="button" onClick={() => saveGoal()}>
            <Save size={15} /> Salvar objetivo
          </button>
          <button className="quick-btn" type="button" onClick={openOverlay}>
            <ExternalLink size={15} /> Abrir overlay
          </button>
          <button className="quick-btn" type="button" onClick={copyOverlayLink}>
            <Share2 size={15} /> Copiar link do overlay
          </button>
          <button className="quick-btn danger" type="button" onClick={resetProgress}>
            <RotateCcw size={15} /> Resetar progresso
          </button>
        </div>

        <div className="live-goal-add-row">
          <Field label={`Adicionar progresso (${calculation.unitLabel})`}>
            <input type="number" value={addAmount} onChange={(event) => setAddAmount(Number(event.target.value))} />
          </Field>
          <button className="quick-btn primary" type="button" onClick={addProgress}>
            <Plus size={15} /> Adicionar progresso
          </button>
        </div>

        {calculation.creatureGoal ? (
          <div className="live-goal-add-row">
            <Field label={`Adicionar abates (${calculation.creatureGoal.name})`}>
              <input type="number" value={creatureAddAmount} onChange={(event) => setCreatureAddAmount(Number(event.target.value))} />
            </Field>
            <button className="quick-btn primary" type="button" onClick={addCreatureProgress}>
              <Plus size={15} /> Adicionar abates
            </button>
          </div>
        ) : null}

        {calculation.bestiarySlots.length ? (
          <div className="live-goal-bestiary-controls">
            {calculation.bestiarySlots.map((slot) => (
              <div className="live-goal-bestiary-control" key={slot.name}>
                <span>
                  <strong>{slot.name}</strong>
                  <small>{slot.current}/{slot.total} - {slot.progressPct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</small>
                </span>
                <div>
                  {[1, 5, 25].map((amount) => (
                    <button
                      className="quick-btn"
                      key={amount}
                      type="button"
                      onClick={() => {
                        const slotRecord = goal.bestiarySlots.find((item) => item.name === slot.name);
                        if (!slotRecord) return;
                        const nextGoal = LiveGoalService.addBestiaryProgress(goal, slotRecord.id, amount);
                        saveGoal(nextGoal);
                      }}
                    >
                      +{amount}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {message ? <p className="note">{message}</p> : null}
      </Panel>

      <Panel title="Pre-visualizacao" eyebrow="overlay limpo">
        <LiveGoalCard calculation={calculation} />
      </Panel>
    </>
  );
}
