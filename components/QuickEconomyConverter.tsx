"use client";

import { Calculator, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { Modal } from "./Modal";
import { currencyShortName, integer, moneySmart, parseGameNumber } from "@/services/format";
import { loadServers } from "@/services/quote-service";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService, type ReinaEconomyContext } from "@/source/web/src/reina-core/economy";
import { CharacterProfileService, getExperienceForLevel } from "@/source/web/src/features/character-profile/services/character-profile-service";
import { ItemSearchClientService } from "@/source/web/src/features/item-database/services/item-search-client-service";
import type { ItemSearchResult } from "@/source/web/src/features/item-database/types";
import { MonsterSearchClientService } from "@/source/web/src/features/monster-database/services/monster-search-client-service";
import type { MonsterSearchResult } from "@/source/web/src/features/monster-database/types";
import type { VaultServer } from "@/types/vault";

type ConverterMode = "gold" | "premium" | "brl";
type GoalMode = "premium" | "gold";
type XpGoalMode = "manual" | "level";

const modeLabels: Record<ConverterMode, string> = {
  gold: "GC",
  premium: "Moeda premium",
  brl: "R$"
};

export function QuickEconomyConverter() {
  const [open, setOpen] = useState(false);
  const [economy, setEconomy] = useState<ReinaEconomyContext | null>(null);
  const [servers, setServers] = useState<VaultServer[]>([]);
  const [mode, setMode] = useState<ConverterMode>("gold");
  const [rawValue, setRawValue] = useState("2700");
  const [goalMode, setGoalMode] = useState<GoalMode>("premium");
  const [goalTotal, setGoalTotal] = useState("25");
  const [goalCurrent, setGoalCurrent] = useState("0");
  const [xpGoalMode, setXpGoalMode] = useState<XpGoalMode>("manual");
  const [xpTarget, setXpTarget] = useState("");
  const [currentLevel, setCurrentLevel] = useState("");
  const [targetLevel, setTargetLevel] = useState("40");
  const [currentExperience, setCurrentExperience] = useState("");
  const [monsterQuery, setMonsterQuery] = useState("");
  const [monsterResults, setMonsterResults] = useState<MonsterSearchResult[]>([]);
  const [selectedMonster, setSelectedMonster] = useState<MonsterSearchResult | null>(null);
  const [monsterXp, setMonsterXp] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [itemResults, setItemResults] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null);
  const [itemPrice, setItemPrice] = useState("");

  useEffect(() => {
    const sync = () => {
      const nextEconomy = ReinaEconomyService.getActiveContext();
      setEconomy(nextEconomy);
      setServers(loadServers());
      const character = ReinaActiveContextService.getActiveContext().character;
      if (character) {
        const xpInfo = CharacterProfileService.getExperienceInfo(character);
        setXpTarget((current) => current || String(xpInfo.missingToNextLevel));
        setCurrentLevel((current) => current || String(xpInfo.level));
        setTargetLevel((current) => current || String(Math.max(xpInfo.level + 1, xpInfo.targetLevel || 40)));
        setCurrentExperience((current) => current || String(xpInfo.currentExperience));
      }
    };
    sync();
    return ReinaEconomyService.subscribe(sync);
  }, []);

  useEffect(() => {
    const query = monsterQuery.trim();
    if (query.length < 2) {
      setMonsterResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setMonsterResults(await MonsterSearchClientService.searchMonsters({ query, signal: controller.signal }));
      } catch {
        if (!controller.signal.aborted) setMonsterResults([]);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [monsterQuery]);

  useEffect(() => {
    const query = itemQuery.trim();
    if (query.length < 2) {
      setItemResults([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        setItemResults(await ItemSearchClientService.searchItems({ query, signal: controller.signal }));
      } catch {
        if (!controller.signal.aborted) setItemResults([]);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [itemQuery]);

  const premiumName = currencyShortName(economy?.currencyName) || "MP";
  const results = useMemo(() => calculateResults(economy, mode, rawValue), [economy, mode, rawValue]);
  const goal = useMemo(() => calculateGoal(economy, goalMode, goalTotal, goalCurrent), [economy, goalMode, goalTotal, goalCurrent]);
  const levelGoal = useMemo(() => calculateLevelGoal(currentLevel, targetLevel, currentExperience), [currentExperience, currentLevel, targetLevel]);
  const effectiveXpTarget = xpGoalMode === "level" ? levelGoal.missingXp : parseGameNumber(xpTarget);
  const monsterKills = useMemo(() => {
    const xpPerKill = parseGameNumber(monsterXp) || selectedMonster?.experience || 0;
    return effectiveXpTarget > 0 && xpPerKill > 0 ? Math.ceil(effectiveXpTarget / xpPerKill) : null;
  }, [effectiveXpTarget, monsterXp, selectedMonster]);
  const itemNeeded = useMemo(() => {
    const price = parseGameNumber(itemPrice) || selectedItem?.npcPrice || 0;
    return goal.missingGold > 0 && price > 0 ? Math.ceil(goal.missingGold / price) : null;
  }, [goal.missingGold, itemPrice, selectedItem]);

  function changeServer(serverId: string) {
    ReinaEconomyService.setActiveServer(serverId);
    setEconomy(ReinaEconomyService.getActiveContext());
  }

  function chooseMonster(monster: MonsterSearchResult) {
    setSelectedMonster(monster);
    setMonsterXp(String(monster.experience));
    setMonsterQuery(monster.name);
    setMonsterResults([]);
  }

  function chooseItem(item: ItemSearchResult) {
    setSelectedItem(item);
    setItemPrice(item.npcPrice ? String(item.npcPrice) : "");
    setItemQuery(item.name);
    setItemResults([]);
  }

  return (
    <>
      <button className="quick-converter-trigger" type="button" onClick={() => setOpen(true)}>
        <Calculator size={16} aria-hidden="true" />
        <span>Ferramenta rápida</span>
      </button>

      <Modal title="Ferramenta rápida" eyebrow={economy?.serverName ?? "Cotação ativa"} open={open} onClose={() => setOpen(false)}>
        <div className="quick-converter">
          <div className="quick-converter-server-row">
            <label>
              <span>Servidor ativo</span>
              <select value={economy?.serverId ?? ""} onChange={(event) => changeServer(event.target.value)}>
                {servers.map((server) => (
                  <option value={server.id} key={server.id}>{ReinaEconomyService.getDisplayName(server)}</option>
                ))}
              </select>
            </label>
            <div className="quick-converter-note">
              <span>Base ativa: <strong>{economy?.platformName ?? "-"} - {economy?.worldName ?? "-"}</strong></span>
              <span>1 {premiumName} = {integer(economy?.goldPerPremium ?? 0)} GC</span>
            </div>
          </div>

          <section className="quick-tool-section">
            <div className="quick-tool-head">
              <h3>Conversor</h3>
              <div className="quick-converter-mode-row" role="tablist" aria-label="Tipo de entrada">
                {(["gold", "premium", "brl"] as ConverterMode[]).map((nextMode) => (
                  <button className={`quick-btn${mode === nextMode ? " primary" : ""}`} key={nextMode} type="button" onClick={() => setMode(nextMode)}>
                    {nextMode === "premium" ? premiumName : modeLabels[nextMode]}
                  </button>
                ))}
              </div>
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
              <MiniMetric label="Gold Coins" value={`${integer(results.gold)} GC`} tone="gold" />
              <MiniMetric label={premiumName} value={`${moneySmart(results.premium, 6)} ${premiumName}`} />
              <MiniMetric label="Se vender" value={`R$ ${moneySmart(results.sellBrl, 6)}`} />
              <MiniMetric label="Para comprar" value={`R$ ${moneySmart(results.buyBrl, 6)}`} tone="red" />
            </div>
          </section>

          <section className="quick-tool-section">
            <div className="quick-tool-head">
              <h3>Objetivo rápido</h3>
              <div className="quick-converter-mode-row">
                <button className={`quick-btn${goalMode === "premium" ? " primary" : ""}`} type="button" onClick={() => setGoalMode("premium")}>{premiumName}</button>
                <button className={`quick-btn${goalMode === "gold" ? " primary" : ""}`} type="button" onClick={() => setGoalMode("gold")}>GC</button>
              </div>
            </div>
            <div className="quick-tool-grid">
              <label className="quick-converter-input">
                <span>Meta</span>
                <input value={goalTotal} inputMode="numeric" onChange={(event) => setGoalTotal(event.target.value)} />
              </label>
              <label className="quick-converter-input">
                <span>Já tenho</span>
                <input value={goalCurrent} inputMode="numeric" onChange={(event) => setGoalCurrent(event.target.value)} />
              </label>
            </div>
            <GoalBar percent={goal.progressPct} label={`${integer(goal.currentGold)} / ${integer(goal.totalGold)} GC`} />
            <div className="quick-tool-inline-note">
              Faltam <strong>{goalMode === "premium" ? `${moneySmart(goal.missingPremium, 4)} ${premiumName}` : `${integer(goal.missingGold)} GC`}</strong>
              <span>Equivale a R$ {moneySmart(goal.missingBrlCompra, 6)} para comprar.</span>
            </div>
          </section>

          <section className="quick-tool-section">
            <div className="quick-tool-head">
              <h3>Monstros para XP</h3>
              <div className="quick-converter-mode-row">
                <button className={`quick-btn${xpGoalMode === "manual" ? " primary" : ""}`} type="button" onClick={() => setXpGoalMode("manual")}>XP manual</button>
                <button className={`quick-btn${xpGoalMode === "level" ? " primary" : ""}`} type="button" onClick={() => setXpGoalMode("level")}>Por level</button>
              </div>
            </div>
            <div className="quick-tool-grid">
              {xpGoalMode === "manual" ? (
                <label className="quick-converter-input">
                  <span>XP que falta</span>
                  <input value={xpTarget} inputMode="numeric" onChange={(event) => setXpTarget(event.target.value)} />
                </label>
              ) : (
                <>
                  <label className="quick-converter-input">
                    <span>Level atual</span>
                    <input value={currentLevel} inputMode="numeric" onChange={(event) => setCurrentLevel(event.target.value)} />
                  </label>
                  <label className="quick-converter-input">
                    <span>Level alvo</span>
                    <input value={targetLevel} inputMode="numeric" onChange={(event) => setTargetLevel(event.target.value)} />
                  </label>
                  <label className="quick-converter-input">
                    <span>XP atual</span>
                    <input value={currentExperience} inputMode="numeric" onChange={(event) => setCurrentExperience(event.target.value)} />
                  </label>
                </>
              )}
              <label className="quick-converter-input">
                <span>Buscar monstro</span>
                <input value={monsterQuery} onChange={(event) => setMonsterQuery(event.target.value)} placeholder="Ex: Tarantula, Corym..." />
              </label>
            </div>
            <div className="quick-tool-inline-note">
              {xpGoalMode === "level" ? (
                <>
                  <span>Level {integer(levelGoal.currentLevel)} para {integer(levelGoal.targetLevel)}</span>
                  <strong>Faltam {integer(levelGoal.missingXp)} XP</strong>
                </>
              ) : (
                <>
                  <span>Meta manual</span>
                  <strong>{integer(effectiveXpTarget)} XP</strong>
                </>
              )}
              <span>Cada criatura calcula quantas kills seriam necessárias sozinha.</span>
            </div>
            <SearchList
              items={monsterResults.slice(0, 5)}
              render={(monster) => (
                <button className="quick-tool-choice" key={monster.name} type="button" onClick={() => chooseMonster(monster)}>
                  <img src={monster.image.path} alt="" />
                  <span><strong>{monster.name}</strong><small>{integer(monster.experience)} XP</small></span>
                </button>
              )}
            />
            {selectedMonster ? (
              <div className="quick-tool-result-row">
                <img src={selectedMonster.image.path} alt="" />
                <span><strong>{selectedMonster.name}</strong><small>XP por kill editável</small></span>
                <input value={monsterXp} inputMode="numeric" onChange={(event) => setMonsterXp(event.target.value)} />
                <b>{monsterKills !== null ? `${integer(monsterKills)} kills` : "-"}</b>
              </div>
            ) : null}
          </section>

          <section className="quick-tool-section">
            <div className="quick-tool-head">
              <h3>Itens para gold</h3>
              <span className="eyebrow">quanto vender para a meta</span>
            </div>
            <label className="quick-converter-input">
              <span>Buscar item</span>
              <input value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Ex: gold coin, focus cape..." />
            </label>
            <SearchList
              items={itemResults.slice(0, 5)}
              render={(item) => (
                <button className="quick-tool-choice" key={item.id} type="button" onClick={() => chooseItem(item)}>
                  <img src={item.image.path} alt="" />
                  <span><strong>{item.name}</strong><small>{item.npcPrice ? `${integer(item.npcPrice)} gp NPC` : "sem preço NPC"}</small></span>
                </button>
              )}
            />
            {selectedItem ? (
              <div className="quick-tool-result-row">
                <img src={selectedItem.image.path} alt="" />
                <span><strong>{selectedItem.name}</strong><small>valor unitário editável</small></span>
                <input value={itemPrice} inputMode="numeric" onChange={(event) => setItemPrice(event.target.value)} />
                <b>{itemNeeded !== null ? `${integer(itemNeeded)}x` : "-"}</b>
              </div>
            ) : null}
          </section>

          <div className="quick-row">
            <button className="quick-btn" type="button" onClick={() => setRawValue(mode === "gold" ? "2700" : "0")}>
              <RotateCcw size={14} aria-hidden="true" /> Resetar conversor
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function MiniMetric({ label, value, tone }: { label: string; value: string; tone?: "gold" | "red" }) {
  return (
    <div className="slot">
      <div className="label">{label}</div>
      <div className={`value ${tone ?? ""}`}>{value}</div>
    </div>
  );
}

function GoalBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div className="quick-goal-bar">
      <div className="quick-goal-bar-head">
        <span>Progresso em gold</span>
        <strong>{label}</strong>
      </div>
      <div className="quick-goal-track">
        <div style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
      </div>
      <small>{percent.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}% concluido</small>
    </div>
  );
}

function SearchList<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  if (!items.length) return null;
  return <div className="quick-tool-choice-list">{items.map(render)}</div>;
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

function calculateGoal(economy: ReinaEconomyContext | null, mode: GoalMode, totalValue: string, currentValue: string) {
  const server = economy?.server ?? null;
  const total = mode === "gold" ? parseGameNumber(totalValue) : parseFlexibleDecimal(totalValue);
  const current = mode === "gold" ? parseGameNumber(currentValue) : parseFlexibleDecimal(currentValue);
  const totalGold = mode === "gold" ? total : ReinaEconomyService.premiumToGold(server, total);
  const currentGold = mode === "gold" ? current : ReinaEconomyService.premiumToGold(server, current);
  const missingGold = Math.max(0, totalGold - currentGold);
  const missingPremium = ReinaEconomyService.goldToPremium(server, missingGold);

  return {
    totalGold,
    currentGold,
    missingGold,
    missingPremium,
    missingBrlCompra: ReinaEconomyService.goldToBrl(server, missingGold, "compra"),
    progressPct: totalGold > 0 ? (currentGold / totalGold) * 100 : 0
  };
}

function calculateLevelGoal(currentLevelValue: string, targetLevelValue: string, currentExperienceValue: string) {
  const currentLevel = Math.max(1, Math.trunc(parseGameNumber(currentLevelValue) || 1));
  const targetLevel = Math.max(currentLevel + 1, Math.trunc(parseGameNumber(targetLevelValue) || currentLevel + 1));
  const currentLevelExperience = getExperienceForLevel(currentLevel);
  const currentExperience = Math.max(currentLevelExperience, Math.trunc(parseGameNumber(currentExperienceValue) || currentLevelExperience));
  const targetExperience = getExperienceForLevel(targetLevel);

  return {
    currentLevel,
    targetLevel,
    currentExperience,
    targetExperience,
    missingXp: Math.max(0, targetExperience - currentExperience)
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
