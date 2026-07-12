"use client";

import { ExternalLink, Pencil, Plus, Save, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";
import { Modal } from "@/components/Modal";
import { Field, Panel, ResultSlot } from "@/components/Panel";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import worldCatalog from "@/source/web/src/reina-core/worlds/generated/world-catalog.json";
import { HuntHistoryService, type HuntHistoryRecord } from "@/source/web/src/features/hunt-analyzer/services/hunt-history-service";
import { CharacterProfileService, getExperienceForLevel } from "../services/character-profile-service";
import type { CharacterLookupResult, CharacterPlatform, CharacterProfile, CharacterVocation } from "../types/character-profile.types";

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
    () => (xpInfo ? calculateProgressPlan(xpInfo.missingToTargetLevel, plannerXpHour, hoursPerDay, sessionHours) : null),
    [xpInfo, plannerXpHour, hoursPerDay, sessionHours]
  );
  const lookupUrl = character ? CharacterProfileService.getCharacterLookupUrl(character) : "";
  const filteredWorlds = useMemo(
    () => worldCatalogEntries.filter((entry) => entry.platform === character?.platform),
    [character?.platform]
  );

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
      setMessage("Nao foi possivel consultar agora. Use preenchimento manual.");
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
          <ResultSlot label="Falta para o proximo" value={formatNumber(xpInfo.missingToNextLevel)} />
          <ResultSlot label={`Falta ate o level ${xpInfo.targetLevel}`} value={formatNumber(xpInfo.missingToTargetLevel)} tone="gold" />
        </div>

        <div className="character-xp-bar">
          <div style={{ width: `${xpInfo.levelProgressPct}%` }} />
        </div>
        {message ? <p className="note">{message}</p> : null}
      </Panel>

      <CollapsiblePanel
        title="Progresso de experiencia"
        eyebrow="level alvo"
        summary={`Level ${xpInfo.level} -> ${xpInfo.targetLevel}. Faltam ${formatNumber(xpInfo.missingToTargetLevel)} XP.`}
      >
        <div className="inputs-grid compact">
          <Field label="Nivel">
            <IntegerInput min={1} value={character.level} onChange={(value) => patch({ level: value })} />
          </Field>
          <Field label="Level alvo">
            <IntegerInput min={character.level + 1} value={character.targetLevel} onChange={(value) => patch({ targetLevel: value })} />
          </Field>
          <Field label="Experiencia atual">
            <IntegerInput value={character.experience} onChange={(value) => patch({ experience: value })} />
          </Field>
          <Field label={`XP ate o level ${xpInfo.targetLevel}`}>
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
            : "Use uma hunt salva ou informe XP/h manual para estimar o tempo ate o alvo."
        }
      >
        <div className="inputs-grid compact">
          <Field label="Hunt de referencia">
            <select value={selectedHunt?.id ?? ""} onChange={(event) => setSelectedHuntId(event.target.value)} disabled={!huntHistory.length}>
              {!huntHistory.length ? <option value="">Nenhuma hunt no historico</option> : null}
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
          <Field label="Horas por sessao">
            <input type="number" min="0.1" step="0.5" value={sessionHours} onChange={(event) => setSessionHours(Number(event.target.value))} />
          </Field>
        </div>

        <div className="hero-grid" style={{ marginTop: 16 }}>
          <ResultSlot label="XP/h usado" value={plannerXpHour > 0 ? `${formatNumber(plannerXpHour)} XP/h` : "-"} />
          <ResultSlot label="Horas ate o alvo" value={progressPlan ? formatHours(progressPlan.hoursNeeded) : "-"} tone="gold" />
          <ResultSlot label="Sessoes estimadas" value={progressPlan ? `${formatNumber(progressPlan.sessionsNeeded)} hunts` : "-"} />
          <ResultSlot label="Dias estimados" value={progressPlan ? `${formatNumber(progressPlan.daysNeeded)} dias` : "-"} tone="gold" />
        </div>

        <p className="note">
          {progressPlan
            ? `Faltam ${formatNumber(xpInfo.missingToTargetLevel)} XP. Com esse ritmo, voce chega no level ${xpInfo.targetLevel} em aproximadamente ${formatHours(progressPlan.hoursNeeded)}.`
            : "Importe uma hunt no Hunt Analyzer ou informe um XP/h manual para estimar o tempo ate o level alvo."}
        </p>
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
        <Field label="Mundo do catalogo">
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
          <ExternalLink size={15} /> Tabela de experiencia
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
        <ResultSlot label="Falta para o proximo" value={formatNumber(xpInfo.missingToNextLevel)} />
        <ResultSlot label={`Falta ate o level ${xpInfo.targetLevel}`} value={formatNumber(xpInfo.missingToTargetLevel)} tone="gold" />
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
        onChange(Math.max(min, nextValue));
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

function calculateProgressPlan(missingExperience: number, xpHour: number, hoursPerDay: number, sessionHours: number) {
  const safeMissingExperience = Math.max(0, Number(missingExperience) || 0);
  const safeXpHour = Math.max(0, Number(xpHour) || 0);
  if (!safeMissingExperience || !safeXpHour) return null;

  const safeHoursPerDay = Math.max(0.1, Number(hoursPerDay) || 1);
  const safeSessionHours = Math.max(0.1, Number(sessionHours) || 1);
  const hoursNeeded = safeMissingExperience / safeXpHour;

  return {
    hoursNeeded,
    sessionsNeeded: Math.ceil(hoursNeeded / safeSessionHours),
    daysNeeded: Math.ceil(hoursNeeded / safeHoursPerDay)
  };
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
