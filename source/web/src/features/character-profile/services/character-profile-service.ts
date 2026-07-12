import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import { StorageService } from "@/services/storage-service";
import experienceTable from "../generated/experience-table.json";
import type { CharacterExperienceInfo, CharacterPlatform, CharacterProfile, CharacterVocation } from "../types/character-profile.types";

export const CHARACTERS_KEY = "reinahub_character_profiles";
export const ACTIVE_CHARACTER_KEY = "reinahub_active_character";

const defaultCharacter: CharacterProfile = {
  id: "character-default",
  profileId: "",
  name: "Reina Kinaity",
  platform: "Tibia Global",
  world: "Yubra",
  linkedServerId: "",
  vocation: "Elite Knight",
  level: 1,
  targetLevel: 200,
  experience: 0,
  residence: "",
  sex: "",
  accountStatus: "",
  lastLogin: "",
  loyaltyTitle: "",
  achievementPoints: 0,
  notes: "",
  updatedAt: Date.now()
};

export class CharacterProfileService {
  static getDefaultCharacter() {
    const economy = ReinaEconomyService.getActiveContext();
    const server = economy.server;
    return normalizeCharacter({
      ...defaultCharacter,
      id: `character-${Date.now()}`,
      profileId: economy.profile?.id ?? "",
      platform: parsePlatform(economy.platformName || defaultCharacter.platform, defaultCharacter.platform),
      world: economy.worldName || defaultCharacter.world,
      linkedServerId: server?.id ?? "",
      updatedAt: Date.now()
    });
  }

  static loadCharacters() {
    const characters = StorageService.get<CharacterProfile[]>(CHARACTERS_KEY, []);
    if (characters.length) return characters.map(normalizeCharacter);
    const initial = this.getDefaultCharacter();
    StorageService.set(CHARACTERS_KEY, [initial]);
    StorageService.setString(ACTIVE_CHARACTER_KEY, initial.id);
    return [initial];
  }

  static getActiveCharacter(profileId?: string) {
    const characters = this.loadCharacters();
    const activeId = StorageService.getString(ACTIVE_CHARACTER_KEY, "");
    const activeCharacter = characters.find((character) => character.id === activeId);
    if (!profileId) return activeCharacter ?? characters[0] ?? this.getDefaultCharacter();
    return (
      activeCharacter?.profileId === profileId
        ? activeCharacter
        : characters.find((character) => character.profileId === profileId)
    ) ?? activeCharacter ?? characters[0] ?? this.getDefaultCharacter();
  }

  static getCharactersForProfile(profileId: string | null | undefined) {
    const characters = this.loadCharacters();
    if (!profileId) return characters;
    return characters.filter((character) => character.profileId === profileId || !character.profileId);
  }

  static syncActiveCharacterWithProfile(profileId: string | null | undefined) {
    if (!profileId) return this.getActiveCharacter();
    const character = this.getActiveCharacter(profileId);
    if (character?.id) StorageService.setString(ACTIVE_CHARACTER_KEY, character.id);
    dispatchCharacterChange();
    return character;
  }

  static saveCharacter(character: CharacterProfile) {
    const economy = ReinaEconomyService.getActiveContext();
    const nextCharacter = normalizeCharacter({
      ...character,
      profileId: character.profileId || economy.profile?.id || "",
      linkedServerId: character.linkedServerId || economy.server?.id || "",
      updatedAt: Date.now()
    });
    const characters = this.loadCharacters();
    const exists = characters.some((row) => row.id === nextCharacter.id);
    const next = exists
      ? characters.map((row) => (row.id === nextCharacter.id ? nextCharacter : row))
      : [nextCharacter, ...characters];
    StorageService.set(CHARACTERS_KEY, next);
    StorageService.setString(ACTIVE_CHARACTER_KEY, nextCharacter.id);
    dispatchCharacterChange();
    return nextCharacter;
  }

  static createCharacter() {
    const next = this.getDefaultCharacter();
    return this.saveCharacter(next);
  }

  static setActiveCharacter(id: string) {
    StorageService.setString(ACTIVE_CHARACTER_KEY, id);
    dispatchCharacterChange();
  }

  static removeCharacter(id: string) {
    const next = this.loadCharacters().filter((character) => character.id !== id);
    StorageService.set(CHARACTERS_KEY, next);
    if (StorageService.getString(ACTIVE_CHARACTER_KEY, "") === id) {
      StorageService.setString(ACTIVE_CHARACTER_KEY, next[0]?.id ?? "");
    }
    dispatchCharacterChange();
    return next;
  }

  static getExperienceInfo(character: CharacterProfile): CharacterExperienceInfo {
    const level = Math.max(1, Math.trunc(Number(character.level) || 1));
    const targetLevel = Math.max(level + 1, Math.trunc(Number(character.targetLevel) || level + 1));
    const currentLevelExperience = getExperienceForLevel(level);
    const nextLevelExperience = getExperienceForLevel(level + 1);
    const targetLevelExperience = getExperienceForLevel(targetLevel);
    const currentExperience = Math.max(Number(character.experience) || 0, currentLevelExperience);
    const span = Math.max(1, nextLevelExperience - currentLevelExperience);
    const gainedInLevel = Math.max(0, currentExperience - currentLevelExperience);

    return {
      level,
      targetLevel,
      currentExperience,
      currentLevelExperience,
      nextLevelExperience,
      missingToNextLevel: Math.max(0, nextLevelExperience - currentExperience),
      targetLevelExperience,
      missingToTargetLevel: Math.max(0, targetLevelExperience - currentExperience),
      levelProgressPct: Math.min(100, Math.max(0, (gainedInLevel / span) * 100))
    };
  }

  static getCharacterLookupUrl(character: CharacterProfile) {
    const name = encodeURIComponent(character.name.trim()).replace(/%20/g, "+");
    if (character.platform === "RubinOT") return "https://rubinot.com.br/characters";
    if (character.platform === "Tibia Global") return `https://www.tibia.com/community/?name=${name}`;
    return "";
  }

  static parseCharacterSheetText(text: string, platform: CharacterPlatform): Partial<CharacterProfile> {
    const rows = parseSheetRows(text);
    const level = parseInteger(findSheetValue(rows, ["Level", "Nivel", "Nível"]));
    const achievementPoints = parseInteger(findSheetValue(rows, ["Achievement Points", "Pontos de Conquista"]));

    return {
      name: findSheetValue(rows, ["Name", "Nome"]),
      platform,
      sex: findSheetValue(rows, ["Sex", "Sexo"]),
      vocation: parseVocation(findSheetValue(rows, ["Vocation", "Vocacao", "Vocação"]), "Custom"),
      level,
      targetLevel: level ? Math.max(level + 1, 200) : undefined,
      experience: level ? getExperienceForLevel(level) : undefined,
      world: findSheetValue(rows, ["World", "Mundo"]),
      residence: findSheetValue(rows, ["Residence", "Residencia", "Residência"]),
      lastLogin: findSheetValue(rows, ["Last Login", "Ultimo Login", "Último Login"]),
      accountStatus: findSheetValue(rows, ["Account Status", "Status da Conta"]),
      loyaltyTitle: findSheetValue(rows, ["Loyalty Title", "Titulo de Lealdade", "Título de Lealdade"]),
      achievementPoints
    };
  }
}

export function getExperienceForLevel(level: number) {
  const safeLevel = Math.max(1, Math.trunc(Number(level) || 1));
  const row = experienceTable.levels.find((entry) => entry.level === safeLevel);
  if (row) return row.experience;
  return Math.floor((50 * safeLevel ** 3 - 150 * safeLevel ** 2 + 400 * safeLevel) / 3);
}

function normalizeCharacter(character: CharacterProfile): CharacterProfile {
  const level = Math.max(1, Math.trunc(Number(character.level) || 1));
  return {
    ...defaultCharacter,
    ...character,
    id: character.id || `character-${Date.now()}`,
    name: character.name?.trim() || defaultCharacter.name,
    platform: parsePlatform(character.platform, defaultCharacter.platform),
    vocation: parseVocation(character.vocation, defaultCharacter.vocation),
    world: character.world?.trim() || defaultCharacter.world,
    linkedServerId: character.linkedServerId ?? "",
    profileId: character.profileId ?? "",
    level,
    targetLevel: Math.max(level + 1, Math.trunc(Number(character.targetLevel) || defaultCharacter.targetLevel)),
    experience: Math.max(0, Math.trunc(Number(character.experience) || getExperienceForLevel(level))),
    achievementPoints: Math.max(0, Math.trunc(Number(character.achievementPoints) || 0)),
    updatedAt: Number(character.updatedAt) || Date.now()
  };
}

function parsePlatform(value: unknown, fallback: CharacterPlatform): CharacterPlatform {
  return ["Tibia Global", "RubinOT", "DeusOT", "Taleon", "OTServer", "Outro"].includes(String(value))
    ? (value as CharacterPlatform)
    : fallback;
}

function parseVocation(value: unknown, fallback: CharacterVocation): CharacterVocation {
  return [
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
  ].includes(String(value))
    ? (value as CharacterVocation)
    : fallback;
}

function parseSheetRows(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.includes("\t") ? line.split(/\t+/) : line.split(/\s*:\s*/);
      if (parts.length < 2) return null;
      return {
        label: normalizeSheetLabel(parts[0]),
        value: parts.slice(1).join(":").trim()
      };
    })
    .filter((row): row is { label: string; value: string } => Boolean(row?.label && row.value));
}

function findSheetValue(rows: Array<{ label: string; value: string }>, labels: string[]) {
  const normalizedLabels = new Set(labels.map(normalizeSheetLabel));
  return rows.find((row) => normalizedLabels.has(row.label))?.value ?? "";
}

function normalizeSheetLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseInteger(value: unknown) {
  const number = Number(String(value ?? "").replace(/\D+/g, ""));
  return Number.isFinite(number) ? number : 0;
}

function dispatchCharacterChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("reinahub:character-change"));
}
