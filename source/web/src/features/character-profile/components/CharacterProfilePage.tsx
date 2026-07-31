"use client";

import { ExternalLink, Pencil, Plus, RefreshCw, Save, Search, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { Modal } from "@/components/Modal";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import worldCatalog from "@/source/web/src/reina-core/worlds/generated/world-catalog.json";
import { HuntHistoryService, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import { ItemSearchClientService } from "@/source/web/src/features/item-database/services/item-search-client-service";
import { PremiumGoalsService } from "@/source/web/src/features/premium-goals/services/premium-goals-service";
import { MonsterSearchClientService } from "@/source/web/src/features/monster-database/services/monster-search-client-service";
import { CharacterProfileService, getExperienceForLevel } from "../services/character-profile-service";
import { CharacterProgressService } from "../services/character-progress-service";
import type { CharacterLookupResult, CharacterPlatform, CharacterProfile, CharacterVocation } from "../types/character-profile.types";
import type { MonsterSearchResult } from "@/source/web/src/features/monster-database/types";
import type { ItemSearchResult } from "@/source/web/src/features/item-database/types";

const platforms: CharacterPlatform[] = ["Tibia Global", "RubinOT", "DeusOT", "Taleon", "OTServer", "Outro"];
const vocations: CharacterVocation[] = [
  "None",
  "Knight",
  "Elite Knight",
  "Paladin",
  "Royal Paladin",
  "Sorcerer",
  "Master Sorcerer",
  "Druid",
  "Elder Druid",
  "Monk",
  "Exalted Monk",
  "Custom"
];
const worldCatalogEntries = worldCatalog.worlds as Array<{ platform: string; world: string; pvpType?: string }>;
const premiumProducts = PremiumGoalsService.listProducts();

export function CharacterProfilePage() {
  const [server, setServer] = useState<VaultServer | null>(null);
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [character, setCharacter] = useState<CharacterProfile | null>(null);
  const [huntHistory, setHuntHistory] = useState<HuntHistoryRecord[]>([]);
  const [selectedHuntId, setSelectedHuntId] = useState("");
  const [manualXpHour, setManualXpHour] = useState(0);
  const [hoursPerDay, setHoursPerDay] = useState(3);
  const [sessionHours, setSessionHours] = useState(1);
  const [pastedCharacterText, setPastedCharacterText] = useState("");
  const [message, setMessage] = useState("");
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);
  const [monsterQuery, setMonsterQuery] = useState("");
  const [monsterResults, setMonsterResults] = useState<MonsterSearchResult[]>([]);
  const [selectedMonsters, setSelectedMonsters] = useState<Array<MonsterSearchResult & { xpOverride?: number }>>([]);
  const [isMonsterLoading, setIsMonsterLoading] = useState(false);
  const [goalProductId, setGoalProductId] = useState(premiumProducts[0]?.id ?? "");
  const [goalOwnedPremium, setGoalOwnedPremium] = useState(0);
  const [goalCostOverride, setGoalCostOverride] = useState(0);
  const [itemQuery, setItemQuery] = useState("");
  const [itemResults, setItemResults] = useState<ItemSearchResult[]>([]);
  const [selectedGoalItems, setSelectedGoalItems] = useState<Array<ItemSearchResult & { unitPriceOverride?: number }>>([]);
  const [isItemLoading, setIsItemLoading] = useState(false);

  useEffect(() => {
    const sync = () => {
      const activeContext = ReinaActiveContextService.getActiveContext();
      setServer(activeContext.server);
      setCharacters(CharacterProfileService.getCharactersForProfile(activeContext.profileId));
      setCharacter(activeContext.character);
      setHuntHistory(HuntHistoryService.load());
    };
    sync();
    return ReinaActiveContextService.subscribe(sync);
  }, []);

  const xpInfo = useMemo(() => (character ? CharacterProfileService.getExperienceInfo(character) : null), [character]);
  const selectedHunt = useMemo(
    () => huntHistory.find((record) => record.id === selectedHuntId) ?? huntHistory[0] ?? null,
    [huntHistory, selectedHuntId]
  );
  const plannerXpHour = useMemo(() => {
    const manual = Number(manualXpHour);
    if (Number.isFinite(manual) && manual > 0) return manual;
    return selectedHunt?.summary.xpHour ?? 0;
  }, [manualXpHour, selectedHunt]);
  const progressPlan = useMemo(
    () => (xpInfo ? CharacterProgressService.calculateProgressPlan(xpInfo.missingToTargetLevel, plannerXpHour, hoursPerDay, sessionHours) : null),
    [xpInfo, plannerXpHour, hoursPerDay, sessionHours]
  );
  const goalProduct = useMemo(() => PremiumGoalsService.getProduct(goalProductId), [goalProductId]);
  const goalCost = Math.max(0, goalCostOverride || goalProduct?.defaultCost || 0);
  const premiumGoal = useMemo(
    () => calculatePremiumObjective(server, goalCost, goalOwnedPremium),
    [server, goalCost, goalOwnedPremium]
  );
  const monsterKillPlans = useMemo(
    () =>
      xpInfo
        ? selectedMonsters.map((monster) => ({
            monster,
            plan: CharacterProgressService.calculateMonsterKillPlan(
              xpInfo.missingToNextLevel,
              xpInfo.missingToTargetLevel,
              monster.xpOverride && monster.xpOverride > 0 ? monster.xpOverride : monster.experience
            )
          }))
        : [],
    [selectedMonsters, xpInfo]
  );
  const lookupUrl = character ? CharacterProfileService.getCharacterLookupUrl(character) : "";
  const filteredWorlds = useMemo(
    () => worldCatalogEntries.filter((entry) => entry.platform === character?.platform),
    [character?.platform]
  );

  useEffect(() => {
    const query = monsterQuery.trim();
    if (query.length < 2) {
      setMonsterResults([]);
      setIsMonsterLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsMonsterLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        setMonsterResults(await MonsterSearchClientService.searchMonsters({ query, signal: controller.signal }));
      } catch {
        if (!controller.signal.aborted) setMonsterResults([]);
      } finally {
        if (!controller.signal.aborted) setIsMonsterLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [monsterQuery]);

  useEffect(() => {
    const progress = PremiumGoalsService.getProgress(goalProductId);
    const product = PremiumGoalsService.getProduct(goalProductId);
    const override = product && server ? PremiumGoalsService.getOverride(product.id, server.id) : null;
    setGoalOwnedPremium(progress?.ownedPremium ?? 0);
    setGoalCostOverride(override?.cost ?? product?.defaultCost ?? 0);
  }, [goalProductId, server?.id]);

  useEffect(() => {
    const query = itemQuery.trim();
    if (query.length < 2) {
      setItemResults([]);
      setIsItemLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsItemLoading(true);
    const timeout = window.setTimeout(async () => {
      try {
        setItemResults(await ItemSearchClientService.searchItems({ query, signal: controller.signal }));
      } catch {
        if (!controller.signal.aborted) setItemResults([]);
      } finally {
        if (!controller.signal.aborted) setIsItemLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [itemQuery]);

  function patch(next: Partial<CharacterProfile>) {
    if (!character) return;
    setCharacter({ ...character, ...next });
  }

  function useActiveServer() {
    if (!server) return;
    patch({
      platform: ReinaEconomyService.getPlatformName(server) as CharacterPlatform,
      world: ReinaEconomyService.getWorldName(server),
      linkedServerId: server.id,
      profileId: ReinaActiveContextService.getActiveContext().profileId ?? ""
    });
  }

  function selectCatalogWorld(value: string) {
    const entry = worldCatalogEntries.find((row) => `${row.platform}:::${row.world}` === value);
    if (!entry) return;
    patch({ platform: entry.platform as CharacterPlatform, world: entry.world });
  }

  function saveCharacter() {
    if (!character) return;
    const saved = CharacterProfileService.saveCharacter(character);
    setCharacter(saved);
    setCharacters(CharacterProfileService.getCharactersForProfile(ReinaActiveContextService.getActiveContext().profileId));
    setMessage("Personagem salvo.");
  }

  function saveObjectives() {
    saveCharacter();
    if (goalProduct && server) {
      PremiumGoalsService.saveOverride(goalProduct.id, server.id, goalCost);
      PremiumGoalsService.saveProgress(goalProduct.id, goalOwnedPremium);
    }
    setMessage("Objetivos salvos.");
  }

  function refreshObjectives() {
    const activeContext = ReinaActiveContextService.getActiveContext();
    const product = PremiumGoalsService.getProduct(goalProductId);
    const override = product && activeContext.server ? PremiumGoalsService.getOverride(product.id, activeContext.server.id) : null;
    const progress = PremiumGoalsService.getProgress(goalProductId);

    setServer(activeContext.server);
    setCharacters(CharacterProfileService.getCharactersForProfile(activeContext.profileId));
    setCharacter(activeContext.character);
    setHuntHistory(HuntHistoryService.load());
    setGoalOwnedPremium(progress?.ownedPremium ?? 0);
    setGoalCostOverride(override?.cost ?? product?.defaultCost ?? 0);
    setMessage("Objetivos atualizados.");
  }

  function createCharacter() {
    const created = CharacterProfileService.createCharacter();
    setCharacter(created);
    setCharacters(CharacterProfileService.getCharactersForProfile(ReinaActiveContextService.getActiveContext().profileId));
    setMessage("Novo personagem criado.");
    setEditOpen(true);
  }

  function removeCharacter() {
    if (!character) return;
    const next = CharacterProfileService.removeCharacter(character.id);
    const activeContext = ReinaActiveContextService.getActiveContext();
    setCharacters(next.filter((row) => row.profileId === activeContext.profileId || !row.profileId));
    setCharacter(CharacterProfileService.getActiveCharacter(activeContext.profileId ?? undefined));
    setMessage("Personagem removido.");
  }

  function selectCharacter(id: string) {
    ReinaActiveContextService.setActiveCharacter(id);
    const selected = CharacterProfileService.getCharactersForProfile(ReinaActiveContextService.getActiveContext().profileId).find((row) => row.id === id) ?? null;
    setCharacter(selected);
    setMessage("");
  }

  function selectMonster(monster: MonsterSearchResult) {
    setSelectedMonsters((current) => {
      if (current.some((row) => row.name === monster.name)) return current;
      return [...current, monster];
    });
    setMonsterQuery("");
    setMonsterResults([]);
  }

  function removeMonsterFromPlan(monsterName: string) {
    setSelectedMonsters((current) => current.filter((monster) => monster.name !== monsterName));
  }

  function updateMonsterXp(monsterName: string, xpOverride: number) {
    setSelectedMonsters((current) =>
      current.map((monster) => (monster.name === monsterName ? { ...monster, xpOverride } : monster))
    );
  }

  function selectGoalItem(item: ItemSearchResult) {
    setSelectedGoalItems((current) => {
      if (current.some((row) => row.id === item.id)) return current;
      return [...current, item];
    });
    setItemQuery("");
    setItemResults([]);
  }

  function removeGoalItem(itemId: number) {
    setSelectedGoalItems((current) => current.filter((item) => item.id !== itemId));
  }

  function updateGoalItemPrice(itemId: number, unitPriceOverride: number) {
    setSelectedGoalItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, unitPriceOverride } : item))
    );
  }

  async function lookupCharacter() {
    if (!character) return;
    setIsLookupLoading(true);
    setMessage("Consultando fonte externa...");
    try {
      const params = new URLSearchParams({ name: character.name, platform: character.platform });
      const response = await fetch(`/api/characters/lookup?${params.toString()}`);
      const result = (await response.json()) as CharacterLookupResult;
      if (!result.ok || !result.character) {
        setMessage(result.message);
        return;
      }

      const imported = result.character;
      const importedLevel = Number(imported.level) || character.level;
      setCharacter({
        ...character,
        ...imported,
        level: importedLevel,
        experience: imported.experience ? Number(imported.experience) : getExperienceForLevel(importedLevel),
        targetLevel: Math.max(Number(character.targetLevel) || 0, importedLevel + 1)
      });
      setMessage("Dados encontrados. Revise e salve o personagem.");
    } catch {
      setMessage("Não foi possível consultar agora. Use preenchimento manual.");
    } finally {
      setIsLookupLoading(false);
    }
  }

  function importPastedCharacter() {
    if (!character) return;
    const imported = CharacterProfileService.parseCharacterSheetText(pastedCharacterText, character.platform);
    if (!imported.name && !imported.level && !imported.world) {
      setMessage("Nao encontrei dados de personagem no texto colado.");
      return;
    }

    const importedLevel = Number(imported.level) || character.level;
    setCharacter({
      ...character,
      ...removeEmptyCharacterFields(imported),
      level: importedLevel,
      experience: imported.experience ? Number(imported.experience) : getExperienceForLevel(importedLevel),
      targetLevel: Math.max(Number(character.targetLevel) || 0, importedLevel + 1)
    });
    setMessage("Ficha colada importada. Revise e salve o personagem.");
  }

  if (!character || !xpInfo) {
    return (
      <Panel title="Personagens" eyebrow="carregando">
        <div className="empty-msg">Carregando personagens...</div>
      </Panel>
    );
  }

  return (
    <>
      <Panel title="Objetivos ativos" eyebrow="level - premium - caminho">
        <div className="objective-command-grid">
          <div className="objective-command-card">
            <div className="label">Objetivo de level</div>
            <div className="value gold">Level {xpInfo.level} para {xpInfo.targetLevel}</div>
            <p className="note">Faltam {formatNumber(xpInfo.missingToTargetLevel)} XP para a meta.</p>
            <div className="character-xp-bar">
              <div style={{ width: `${xpInfo.levelProgressPct}%` }} />
            </div>
          </div>
          <div className="objective-command-card">
            <div className="label">Objetivo premium</div>
            <div className="value gold">{goalProduct?.name ?? "Produto premium"}</div>
            <p className="note">
              {server
                ? `Faltam ${formatNumber(premiumGoal.missingPremium)} ${server.moeda}, ${formatNumber(premiumGoal.missingGold)} GC ou R$ ${moneyBR(premiumGoal.missingBrlCompra)}.`
                : "Configure um servidor ativo para calcular GC e reais."}
            </p>
            <div className="quick-row">
              <button className="quick-btn primary" type="button" onClick={saveObjectives}>
                Salvar objetivos
              </button>
              <button className="quick-btn" type="button" onClick={refreshObjectives}>
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
          </div>
        </div>

        <div className="objective-control-grid">
          <Field label="Level alvo">
            <IntegerInput min={character.level + 1} value={character.targetLevel} onChange={(value) => patch({ targetLevel: value })} />
          </Field>
          <Field label="Produto premium">
            <select value={goalProductId} onChange={(event) => setGoalProductId(event.target.value)}>
              {premiumProducts.map((product) => (
                <option value={product.id} key={product.id}>{product.name}</option>
              ))}
            </select>
          </Field>
          <Field label={`Ja tenho (${server?.moeda ?? "moeda premium"})`}>
            <IntegerInput value={goalOwnedPremium} onChange={setGoalOwnedPremium} />
          </Field>
          <Field label={`Custo (${server?.moeda ?? "moeda premium"})`}>
            <IntegerInput value={goalCost} onChange={setGoalCostOverride} />
          </Field>
        </div>
      </Panel>

      <Panel title="Personagem ativo" eyebrow="char - mundo - progresso">
        <div className="character-hero">
          <button
            className="character-title-button"
            type="button"
            onClick={() => setEditOpen(true)}
            aria-label="Editar personagem ativo"
          >
            <div className="eyebrow">{character.platform} - {character.world}</div>
            <h2>{character.name}</h2>
            <p className="note">{character.vocation} - level {character.level}</p>
          </button>
          <div className="character-actions">
            <button className="quick-btn" type="button" onClick={() => setLookupOpen(true)}>
              <Search size={15} /> Buscar / vincular
            </button>
            <button className="quick-btn" type="button" onClick={() => setEditOpen(true)}>
              <Pencil size={15} /> Editar
            </button>
            <button className="quick-btn primary" type="button" onClick={saveCharacter}>
              <Save size={15} /> Salvar
            </button>
            <button className="quick-btn" type="button" onClick={createCharacter}>
              <Plus size={15} /> Novo
            </button>
            <button className="quick-btn danger icon-btn" type="button" onClick={removeCharacter} aria-label="Remover personagem">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="hero-grid">
          <ResultSlot label="Level" value={String(xpInfo.level)} />
          <ResultSlot label="XP atual" value={formatNumber(xpInfo.currentExperience)} tone="gold" />
          <ResultSlot label="Falta para o próximo" value={formatNumber(xpInfo.missingToNextLevel)} />
          <ResultSlot label={`Falta até o level ${xpInfo.targetLevel}`} value={formatNumber(xpInfo.missingToTargetLevel)} tone="gold" />
        </div>

        <div className="character-xp-bar">
          <div style={{ width: `${xpInfo.levelProgressPct}%` }} />
        </div>
        {message ? <p className="note">{message}</p> : null}
      </Panel>

      <CollapsiblePanel
        title="Progresso de experiência"
        eyebrow="level alvo"
        summary={`Level ${xpInfo.level} -> ${xpInfo.targetLevel}. Faltam ${formatNumber(xpInfo.missingToTargetLevel)} XP.`}
      >
        <div className="inputs-grid compact">
          <Field label="Nível">
            <IntegerInput min={1} value={character.level} onChange={(value) => patch({ level: value })} />
          </Field>
          <Field label="Level alvo">
            <IntegerInput min={character.level + 1} value={character.targetLevel} onChange={(value) => patch({ targetLevel: value })} />
          </Field>
          <Field label="Experiência atual">
            <IntegerInput value={character.experience} onChange={(value) => patch({ experience: value })} />
          </Field>
          <Field label={`XP até o level ${xpInfo.targetLevel}`}>
            <input value={formatNumber(xpInfo.missingToTargetLevel)} readOnly />
          </Field>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Planejamento por hunt"
        eyebrow="xp/h - tempo - rotina"
        summary={
          progressPlan
            ? `${formatHours(progressPlan.hoursNeeded)} estimadas usando ${formatNumber(plannerXpHour)} XP/h.`
            : "Use uma hunt salva ou informe XP/h manual para estimar o tempo até o alvo."
        }
      >
        <div className="inputs-grid compact">
          <Field label="Hunt de referência">
            <select value={selectedHunt?.id ?? ""} onChange={(event) => setSelectedHuntId(event.target.value)} disabled={!huntHistory.length}>
              {!huntHistory.length ? <option value="">Nenhuma hunt no histórico</option> : null}
              {huntHistory.map((record) => (
                <option key={record.id} value={record.id}>
                  {formatDate(record.createdAt)} - {record.sourceName} - {formatNumber(record.summary.xpHour)} XP/h
                </option>
              ))}
            </select>
          </Field>
          <Field label="XP/h manual">
            <IntegerInput
              value={manualXpHour}
              onChange={setManualXpHour}
              placeholder={selectedHunt ? formatNumber(selectedHunt.summary.xpHour) : "Ex: 5.000.000"}
            />
          </Field>
          <Field label="Horas por dia">
            <input type="number" min="0.1" step="0.5" value={hoursPerDay} onChange={(event) => setHoursPerDay(Number(event.target.value))} />
          </Field>
          <Field label="Horas por sessão">
            <input type="number" min="0.1" step="0.5" value={sessionHours} onChange={(event) => setSessionHours(Number(event.target.value))} />
          </Field>
        </div>

        <div className="hero-grid" style={{ marginTop: 16 }}>
          <ResultSlot label="XP/h usado" value={plannerXpHour > 0 ? `${formatNumber(plannerXpHour)} XP/h` : "-"} />
          <ResultSlot label="Horas até o alvo" value={progressPlan ? formatHours(progressPlan.hoursNeeded) : "-"} tone="gold" />
          <ResultSlot label="Sessões estimadas" value={progressPlan ? `${formatNumber(progressPlan.sessionsNeeded)} hunts` : "-"} />
          <ResultSlot label="Dias estimados" value={progressPlan ? `${formatNumber(progressPlan.daysNeeded)} dias` : "-"} tone="gold" />
        </div>

        <p className="note">
          {progressPlan
            ? `Faltam ${formatNumber(xpInfo.missingToTargetLevel)} XP. Com esse ritmo, você chega no level ${xpInfo.targetLevel} em aproximadamente ${formatHours(progressPlan.hoursNeeded)}.`
            : "Importe uma hunt no Hunt Analyzer ou informe um XP/h manual para estimar o tempo até o level alvo."}
        </p>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Calculadora por criatura"
        eyebrow="kills para upar"
        summary={
          monsterKillPlans.length
            ? `${formatNumber(monsterKillPlans.length)} criatura(s) comparadas para o próximo level.`
            : "Escolha criaturas para calcular quantas kills faltam para passar de level."
        }
      >
        <div className="character-monster-planner">
          <div className="inputs-grid compact">
            <Field label="Criatura">
              <input
                value={monsterQuery}
                onChange={(event) => setMonsterQuery(event.target.value)}
                placeholder="Ex: Corym Charlatan, Dragon, Rat"
              />
            </Field>
            <Field label="Como funciona">
              <input value="Cada criatura calcula separada, sem somar com as outras." readOnly />
            </Field>
          </div>

          {monsterResults.length || isMonsterLoading ? (
            <div className="monster-kill-results">
              {isMonsterLoading ? <div className="empty-msg">Buscando criatura...</div> : null}
              {monsterResults.slice(0, 8).map((monster) => (
                <button
                  className={`monster-kill-option${selectedMonsters.some((row) => row.name === monster.name) ? " active" : ""}`}
                  key={monster.name}
                  type="button"
                  onClick={() => selectMonster(monster)}
                >
                  <img src={monster.image.path} alt="" loading="lazy" />
                  <span>
                    <strong>{monster.name}</strong>
                      <small>{formatNumber(monster.experience)} XP por kill</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {monsterKillPlans.length ? (
            <div className="monster-kill-plan-list">
              {monsterKillPlans.map(({ monster, plan }) => (
                <div className="monster-kill-plan-row" key={monster.name}>
                  <div className="monster-kill-plan-title">
                    <img src={monster.image.path} alt="" loading="lazy" />
                    <span>
                      <strong>{monster.name}</strong>
                      <small>{monster.health ? `${formatNumber(monster.health)} HP` : "criatura selecionada"}</small>
                    </span>
                  </div>
                  <label>
                    <span>XP/kill</span>
                    <IntegerInput
                      value={monster.xpOverride || monster.experience}
                      onChange={(value) => updateMonsterXp(monster.name, value)}
                    />
                  </label>
                  <div>
                    <span>Próximo level</span>
                    <strong>{plan ? `${formatNumber(plan.killsToNextLevel)} kills` : "-"}</strong>
                  </div>
                  <div>
                    <span>Até level {xpInfo.targetLevel}</span>
                    <strong>{plan ? `${formatNumber(plan.killsToTargetLevel)} kills` : "-"}</strong>
                  </div>
                  <button className="icon-btn danger" type="button" onClick={() => removeMonsterFromPlan(monster.name)} aria-label={`Remover ${monster.name}`}>
                    <X size={15} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <p className="note">
            {monsterKillPlans.length
              ? `Faltam ${formatNumber(xpInfo.missingToNextLevel)} XP para o level ${xpInfo.level + 1}. Cada linha mostra quantas kills daquela criatura seriam necessárias sozinha.`
              : "A conta usa a experiência base da criatura. Se o servidor tiver XP diferente, edite o XP/kill na própria linha."}
          </p>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Itens para objetivo premium"
        eyebrow="item - preço - quantidade"
        summary={
          selectedGoalItems.length
            ? `${formatNumber(selectedGoalItems.length)} item(ns) comparados para comprar ${goalProduct?.name ?? "o objetivo"}.`
            : "Escolha itens para ver quantos precisa vender até o objetivo premium."
        }
      >
        <div className="character-monster-planner">
          <div className="inputs-grid compact">
            <Field label="Buscar item">
              <input
                value={itemQuery}
                onChange={(event) => setItemQuery(event.target.value)}
                placeholder="Ex: dragon ham, gold coin, focus cape"
              />
            </Field>
            <Field label="Meta em gold">
              <input value={server ? `${formatNumber(premiumGoal.missingGold)} GC faltando` : "Configure a cotação"} readOnly />
            </Field>
          </div>

          {itemResults.length || isItemLoading ? (
            <div className="monster-kill-results">
              {isItemLoading ? <div className="empty-msg">Buscando item...</div> : null}
              {itemResults.slice(0, 8).map((item) => (
                <button
                  className={`monster-kill-option${selectedGoalItems.some((row) => row.id === item.id) ? " active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => selectGoalItem(item)}
                >
                  <img src={item.image.path} alt="" loading="lazy" />
                  <span>
                    <strong>{item.name}</strong>
                    <small>{item.npcPrice ? `${formatNumber(item.npcPrice)} gp NPC` : "sem preço NPC"}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          {selectedGoalItems.length ? (
            <div className="monster-kill-plan-list">
              {selectedGoalItems.map((item) => {
                const unitPrice = Math.max(0, item.unitPriceOverride || item.npcPrice || 0);
                const needed = unitPrice > 0 ? Math.ceil(premiumGoal.missingGold / unitPrice) : null;
                return (
                  <div className="monster-kill-plan-row" key={item.id}>
                    <div className="monster-kill-plan-title">
                      <img src={item.image.path} alt="" loading="lazy" />
                      <span>
                        <strong>{item.name}</strong>
                        <small>{item.category} #{item.id}</small>
                      </span>
                    </div>
                    <label>
                      <span>Valor unit.</span>
                      <IntegerInput value={unitPrice} onChange={(value) => updateGoalItemPrice(item.id, value)} />
                    </label>
                    <div>
                      <span>Precisa vender</span>
                      <strong>{needed !== null ? `${formatNumber(needed)}x` : "-"}</strong>
                    </div>
                    <div>
                      <span>Meta gold</span>
                      <strong>{formatNumber(premiumGoal.missingGold)} GC</strong>
                    </div>
                    <button className="icon-btn danger" type="button" onClick={() => removeGoalItem(item.id)} aria-label={`Remover ${item.name}`}>
                      <X size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <p className="note">
            Cada item calcula sozinho quantas unidades precisariam ser vendidas para cobrir o gold que falta. Você pode trocar o valor unitário para usar Market ou preço de servidor.
          </p>
        </div>
      </CollapsiblePanel>

      <CollapsiblePanel
        title="Meus personagens"
        eyebrow="perfis locais"
        summary={`${formatNumber(characters.length)} personagem(ns) salvos neste contexto.`}
      >
        <div className="character-list">
          {characters.map((row) => (
            <button className={`character-row${row.id === character.id ? " active" : ""}`} key={row.id} type="button" onClick={() => selectCharacter(row.id)}>
              <span>
                <strong>{row.name}</strong>
                <small>{row.vocation} - {row.platform} - {row.world}</small>
              </span>
              <b>{row.level}</b>
            </button>
          ))}
        </div>
      </CollapsiblePanel>

      <Modal
        title="Busca e vinculo"
        eyebrow={server ? `Servidor ativo: ${ReinaEconomyService.getDisplayName(server)}` : "manual"}
        open={lookupOpen}
        onClose={() => setLookupOpen(false)}
      >
        <CharacterLookupContent
          character={character}
          filteredWorlds={filteredWorlds}
          isLookupLoading={isLookupLoading}
          lookupUrl={lookupUrl}
          pastedCharacterText={pastedCharacterText}
          server={server}
          onImportPastedCharacter={importPastedCharacter}
          onLookupCharacter={lookupCharacter}
          onPatch={patch}
          onPastedCharacterTextChange={setPastedCharacterText}
          onSelectCatalogWorld={selectCatalogWorld}
          onUseActiveServer={useActiveServer}
        />
      </Modal>

      <Modal title="Editar personagem" eyebrow="dados principais" open={editOpen} onClose={() => setEditOpen(false)}>
        <CharacterEditContent
          character={character}
          xpInfo={xpInfo}
          onPatch={patch}
          onSave={() => {
            saveCharacter();
            setEditOpen(false);
          }}
        />
      </Modal>
    </>
  );
}

function CharacterLookupContent({
  character,
  filteredWorlds,
  isLookupLoading,
  lookupUrl,
  pastedCharacterText,
  server,
  onImportPastedCharacter,
  onLookupCharacter,
  onPatch,
  onPastedCharacterTextChange,
  onSelectCatalogWorld,
  onUseActiveServer
}: {
  character: CharacterProfile;
  filteredWorlds: Array<{ platform: string; world: string; pvpType?: string }>;
  isLookupLoading: boolean;
  lookupUrl: string;
  pastedCharacterText: string;
  server: VaultServer | null;
  onImportPastedCharacter: () => void;
  onLookupCharacter: () => void;
  onPatch: (next: Partial<CharacterProfile>) => void;
  onPastedCharacterTextChange: (text: string) => void;
  onSelectCatalogWorld: (value: string) => void;
  onUseActiveServer: () => void;
}) {
  return (
    <div className="modal-form-stack">
      <div className="character-lookup-grid">
        <Field label="Nome do personagem">
          <input value={character.name} onChange={(event) => onPatch({ name: event.target.value })} />
        </Field>
        <Field label="Plataforma">
          <select value={character.platform} onChange={(event) => onPatch({ platform: event.target.value as CharacterPlatform, world: "" })}>
            {platforms.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
          </select>
        </Field>
        <Field label="Mundo do catálogo">
          <select value={`${character.platform}:::${character.world}`} onChange={(event) => onSelectCatalogWorld(event.target.value)}>
            <option value={`${character.platform}:::${character.world}`}>{character.world || "Selecionar mundo"}</option>
            {filteredWorlds.map((entry) => (
              <option value={`${entry.platform}:::${entry.world}`} key={`${entry.platform}-${entry.world}`}>
                {entry.world}{entry.pvpType ? ` (${entry.pvpType})` : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Mundo manual">
          <input value={character.world} onChange={(event) => onPatch({ world: event.target.value })} />
        </Field>
      </div>

      <div className="character-links">
        <button className="quick-btn primary" type="button" onClick={onLookupCharacter} disabled={isLookupLoading}>
          {isLookupLoading ? "Buscando..." : "Buscar online"}
        </button>
        <button className="quick-btn" type="button" onClick={onUseActiveServer} disabled={!server}>
          Usar servidor ativo
        </button>
        {lookupUrl ? (
          <a className="quick-btn" href={lookupUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={15} /> Consultar personagem
          </a>
        ) : null}
        <a className="quick-btn" href="https://www.tibia.com/library/?subtopic=experiencetable" target="_blank" rel="noreferrer">
          <ExternalLink size={15} /> Tabela de experiência
        </a>
      </div>

      <div className="character-paste-import">
        <Field label="Colar ficha do personagem">
          <textarea
            rows={4}
            value={pastedCharacterText}
            onChange={(event) => onPastedCharacterTextChange(event.target.value)}
            placeholder={"Ex: Nome: Reina Gameplay\nVocacao: Elite Knight\nNivel: 170\nMundo: Elysian"}
          />
        </Field>
        <button className="quick-btn" type="button" onClick={onImportPastedCharacter} disabled={!pastedCharacterText.trim()}>
          Importar texto colado
        </button>
      </div>
    </div>
  );
}

function CharacterEditContent({
  character,
  xpInfo,
  onPatch,
  onSave
}: {
  character: CharacterProfile;
  xpInfo: NonNullable<ReturnType<typeof CharacterProfileService.getExperienceInfo>>;
  onPatch: (next: Partial<CharacterProfile>) => void;
  onSave: () => void;
}) {
  return (
    <div className="modal-form-stack">
      <div className="inputs-grid compact">
        <Field label="Nome">
          <input value={character.name} onChange={(event) => onPatch({ name: event.target.value })} />
        </Field>
        <Field label="Nivel">
          <IntegerInput min={1} value={character.level} onChange={(value) => onPatch({ level: value })} />
        </Field>
        <Field label="Level alvo">
          <IntegerInput min={character.level + 1} value={character.targetLevel} onChange={(value) => onPatch({ targetLevel: value })} />
        </Field>
        <Field label="Experiencia atual">
          <IntegerInput value={character.experience} onChange={(value) => onPatch({ experience: value })} />
        </Field>
      </div>

      <div className="hero-grid">
        <ResultSlot label="Level" value={String(xpInfo.level)} />
        <ResultSlot label="XP atual" value={formatNumber(xpInfo.currentExperience)} tone="gold" />
        <ResultSlot label="Falta para o próximo" value={formatNumber(xpInfo.missingToNextLevel)} />
        <ResultSlot label={`Falta até o level ${xpInfo.targetLevel}`} value={formatNumber(xpInfo.missingToTargetLevel)} tone="gold" />
      </div>

      <div className="inputs-grid compact">
        <Field label="Vocacao">
          <select value={character.vocation} onChange={(event) => onPatch({ vocation: event.target.value as CharacterVocation })}>
            {vocations.map((vocation) => <option key={vocation} value={vocation}>{vocation}</option>)}
          </select>
        </Field>
        <Field label="Residencia">
          <input value={character.residence} onChange={(event) => onPatch({ residence: event.target.value })} />
        </Field>
        <Field label="Sexo">
          <input value={character.sex} onChange={(event) => onPatch({ sex: event.target.value })} />
        </Field>
        <Field label="Status da conta">
          <input value={character.accountStatus} onChange={(event) => onPatch({ accountStatus: event.target.value })} />
        </Field>
        <Field label="Ultimo login">
          <input value={character.lastLogin} onChange={(event) => onPatch({ lastLogin: event.target.value })} />
        </Field>
        <Field label="Titulo de lealdade">
          <input value={character.loyaltyTitle} onChange={(event) => onPatch({ loyaltyTitle: event.target.value })} />
        </Field>
        <Field label="Pontos de conquista">
          <IntegerInput value={character.achievementPoints} onChange={(value) => onPatch({ achievementPoints: value })} />
        </Field>
      </div>

      <Field label="Notas">
        <textarea rows={3} value={character.notes} onChange={(event) => onPatch({ notes: event.target.value })} />
      </Field>

      <div className="quick-row">
        <button className="quick-btn primary" type="button" onClick={onSave}>
          <Save size={15} /> Salvar personagem
        </button>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function IntegerInput({
  min = 0,
  onChange,
  placeholder,
  value
}: {
  min?: number;
  onChange: (value: number) => void;
  placeholder?: string;
  value: number;
}) {
  return (
    <input
      inputMode="numeric"
      min={min}
      pattern="[0-9.]*"
      placeholder={placeholder}
      value={value > 0 ? formatNumber(value) : ""}
      onChange={(event) => {
        const nextValue = parseIntegerInput(event.target.value);
        onChange(nextValue);
      }}
      onBlur={() => {
        if (value < min) onChange(min);
      }}
    />
  );
}

function parseIntegerInput(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}

function formatDate(value: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(value);
}

function formatHours(value: number) {
  if (!Number.isFinite(value)) return "-";
  if (value < 1) return `${formatNumber(Math.ceil(value * 60))} min`;
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

function calculatePremiumObjective(server: VaultServer | null, cost: number, ownedPremium: number) {
  const safeCost = Math.max(0, Math.trunc(Number(cost) || 0));
  const safeOwnedPremium = Math.max(0, Math.trunc(Number(ownedPremium) || 0));
  const missingPremium = Math.max(0, safeCost - safeOwnedPremium);
  const missingGold = server ? missingPremium * Math.max(0, Number(server.gcPorMoeda) || 0) : 0;

  return {
    cost: safeCost,
    ownedPremium: safeOwnedPremium,
    missingPremium,
    missingGold,
    missingBrlVenda: ReinaEconomyService.premiumToBrl(server, missingPremium, "venda"),
    missingBrlCompra: ReinaEconomyService.premiumToBrl(server, missingPremium, "compra")
  };
}

function moneyBR(value: number) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6
  });
}

function removeEmptyCharacterFields(character: Partial<CharacterProfile>) {
  return Object.fromEntries(
    Object.entries(character).filter(([, value]) => {
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return Number.isFinite(value) && value > 0;
      return value !== undefined && value !== null;
    })
  ) as Partial<CharacterProfile>;
}
