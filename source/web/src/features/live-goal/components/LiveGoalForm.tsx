"use client";

import { Plus, Trash2 } from "lucide-react";
import { Field, Panel } from "@/components/Panel";
import type { VaultServer } from "@/types/vault";
import { LiveGoalService } from "../services/live-goal-service";
import type { LiveGoal, LiveGoalCurrency, LiveGoalTheme, LiveGoalType } from "../types/live-goal.types";

const goalTypes: Array<{ value: LiveGoalType; label: string }> = [
  { value: "premium", label: "Premium" },
  { value: "mount", label: "Mount" },
  { value: "outfit", label: "Outfit" },
  { value: "bless", label: "Bless" },
  { value: "item", label: "Item" },
  { value: "creature", label: "Criatura / Bestiary" },
  { value: "custom", label: "Custom" }
];

const currencies: Array<{ value: LiveGoalCurrency; label: string }> = [
  { value: "Tibia Coin", label: "Tibia Coin" },
  { value: "RC", label: "RC" },
  { value: "gold", label: "Gold" },
  { value: "real", label: "Real" },
  { value: "kill", label: "Kills / abates" }
];
const themes: Array<{ value: LiveGoalTheme; label: string }> = [
  { value: "royal", label: "Royal gold" },
  { value: "emerald", label: "Emerald" },
  { value: "arcane", label: "Arcane cyan" }
];

export function LiveGoalForm({
  goal,
  server,
  onChange
}: {
  goal: LiveGoal;
  server: VaultServer | null;
  onChange: (goal: LiveGoal) => void;
}) {
  const patch = (next: Partial<LiveGoal>) => onChange({ ...goal, ...next });
  const isKillGoal = goal.type === "creature" || goal.currency === "kill";
  const bestiarySlots = goal.bestiarySlots ?? [];

  return (
    <Panel title="Configurar objetivo" eyebrow="live - overlay - progresso">
      <div className="quick-row" style={{ marginTop: 0, marginBottom: 16 }}>
        <button className="quick-btn primary" type="button" onClick={() => onChange(LiveGoalService.createPremiumBestiaryPreset(goal, server))}>
          Preparar Premium + Bestiary Free
        </button>
      </div>
      <div className="inputs-grid">
        <Field label={isKillGoal ? "Nome da criatura" : "Nome do item"}>
          <input value={goal.itemName} onChange={(event) => patch({ itemName: event.target.value })} />
        </Field>
        <Field label="Tipo">
          <select
            value={goal.type}
            onChange={(event) => {
              const type = event.target.value as LiveGoalType;
              patch({ type, currency: type === "creature" ? "kill" : goal.currency });
            }}
          >
            {goalTypes.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <Field label="Moeda">
          <select value={goal.currency} onChange={(event) => patch({ currency: event.target.value as LiveGoalCurrency })}>
            {currencies.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </Field>
        <Field label={isKillGoal ? "Quantidade alvo" : "Preco total"}>
          <input type="number" min="0" value={goal.total} onChange={(event) => patch({ total: Number(event.target.value) })} />
        </Field>
        <Field label={isKillGoal ? "Quantidade feita" : "Valor ja conquistado"}>
          <input type="number" min="0" value={goal.current} onChange={(event) => patch({ current: Number(event.target.value) })} />
        </Field>
        <Field label="Cotacao usada">
          <input value={isKillGoal ? "Meta de criaturas sem conversao de preco" : server ? `${server.gcPorMoeda} gold por ${server.moeda}` : "Servidor nao definido"} readOnly />
        </Field>
        <Field label="Imagem ou icone opcional">
          <input placeholder="/assets/items/3035.gif" value={goal.imageUrl} onChange={(event) => patch({ imageUrl: event.target.value })} />
        </Field>
        <Field label="Tema visual">
          <select value={goal.theme} onChange={(event) => patch({ theme: event.target.value as LiveGoalTheme })}>
            {themes.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}
          </select>
        </Field>
      </div>

      <div className="live-goal-form-wide">
        <Field label="Texto personalizado da live">
          <textarea rows={3} value={goal.customText} onChange={(event) => patch({ customText: event.target.value })} />
        </Field>
      </div>

      <div className="live-goal-creature-config">
        <label className="live-goal-toggle">
          <input
            type="checkbox"
            checked={goal.showCreatureGoal}
            onChange={(event) => patch({ showCreatureGoal: event.target.checked })}
          />
          Mostrar meta de criatura junto do objetivo
        </label>

        {goal.showCreatureGoal ? (
          <>
            <div className="quick-row" style={{ marginTop: 0, marginBottom: 12 }}>
              <button className="quick-btn" type="button" onClick={() => onChange(LiveGoalService.addBestiarySlot(goal))}>
                <Plus size={15} /> Adicionar slot de bestiario
              </button>
            </div>
            <div className="live-goal-bestiary-list">
              {bestiarySlots.map((slot, index) => (
                <div className="live-goal-bestiary-editor" key={slot.id}>
                  <div className="label">Bestiario {index + 1}</div>
                  <div className="inputs-grid compact">
                    <Field label="Criatura">
                      <input value={slot.name} onChange={(event) => onChange(LiveGoalService.updateBestiarySlot(goal, slot.id, { name: event.target.value }))} />
                    </Field>
                    <Field label="Feito">
                      <input type="number" min="0" value={slot.current} onChange={(event) => onChange(LiveGoalService.updateBestiarySlot(goal, slot.id, { current: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Alvo">
                      <input type="number" min="0" value={slot.total} onChange={(event) => onChange(LiveGoalService.updateBestiarySlot(goal, slot.id, { total: Number(event.target.value) }))} />
                    </Field>
                    <Field label="Imagem opcional">
                      <input placeholder="/assets/monsters/spider.gif" value={slot.imageUrl ?? ""} onChange={(event) => onChange(LiveGoalService.updateBestiarySlot(goal, slot.id, { imageUrl: event.target.value }))} />
                    </Field>
                  </div>
                  <div className="quick-row">
                    {[-25, -1, 1, 25].map((amount) => (
                      <button className="quick-btn" type="button" key={amount} onClick={() => onChange(LiveGoalService.addBestiaryProgress(goal, slot.id, amount))}>
                        {amount > 0 ? `+${amount}` : amount}
                      </button>
                    ))}
                    <button className="quick-btn danger" type="button" onClick={() => onChange(LiveGoalService.removeBestiarySlot(goal, slot.id))}>
                      <Trash2 size={15} /> Remover
                    </button>
                  </div>
                </div>
              ))}
              {!bestiarySlots.length ? <div className="empty-msg">Nenhum slot de bestiario ainda.</div> : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="live-goal-checks">
        <label>
          <input type="checkbox" checked={goal.showBrl} onChange={(event) => patch({ showBrl: event.target.checked })} />
          Mostrar valores em R$
        </label>
        <label>
          <input type="checkbox" checked={goal.showGold} onChange={(event) => patch({ showGold: event.target.checked })} />
          Mostrar gold
        </label>
      </div>
    </Panel>
  );
}
