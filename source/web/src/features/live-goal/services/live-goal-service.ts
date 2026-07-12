import { StorageService } from "@/services/storage-service";
import { ReinaActiveContextService } from "@/source/web/src/reina-core/active-context";
import { ReinaEconomyService } from "@/source/web/src/reina-core/economy";
import type { VaultServer } from "@/types/vault";
import type { LiveBestiarySlot, LiveGoal, LiveGoalCalculation, LiveGoalCurrency, LiveGoalTheme, LiveGoalType } from "../types/live-goal.types";

export const LIVE_GOALS_KEY = "reinahub_live_goals";
export const ACTIVE_LIVE_GOAL_KEY = "reinahub_active_live_goal";

const defaultGoal: LiveGoal = {
  id: "live-goal-default",
  itemName: "Loot Pouch",
  type: "item",
  currency: "RC",
  total: 390,
  current: 120,
  showCreatureGoal: true,
  creatureName: "Tarantula",
  creatureTotal: 50,
  creatureCurrent: 25,
  creatureImageUrl: "",
  bestiarySlots: [
    { id: "bestiary-spider", name: "Spider", current: 25, total: 250 },
    { id: "bestiary-minotaur", name: "Minotaur", current: 100, total: 500 }
  ],
  customText: "Meta da live: Premium e evolucao do personagem",
  imageUrl: "",
  showBrl: true,
  showGold: true,
  theme: "royal",
  updatedAt: Date.now()
};

export class LiveGoalService {
  static getDefaultGoal() {
    const context = ReinaActiveContextService.getActiveContext();
    return {
      ...defaultGoal,
      id: `live-goal-${Date.now()}`,
      profileId: context.profileId,
      profileName: context.profile?.name ?? null,
      characterId: context.characterId,
      characterName: context.character?.name ?? null,
      serverId: context.serverId,
      updatedAt: Date.now()
    };
  }

  static loadGoals() {
    const goals = StorageService.get<LiveGoal[]>(LIVE_GOALS_KEY, []);
    if (goals.length) return goals.map(normalizeGoal);
    const initial = this.getDefaultGoal();
    StorageService.set(LIVE_GOALS_KEY, [initial]);
    StorageService.setString(ACTIVE_LIVE_GOAL_KEY, initial.id);
    return [initial];
  }

  static getActiveGoal() {
    const goals = this.loadGoals();
    const activeId = StorageService.getString(ACTIVE_LIVE_GOAL_KEY, "");
    const context = ReinaActiveContextService.getActiveContext();
    const activeGoal = goals.find((goal) => goal.id === activeId);
    return (
      activeGoal && matchesContext(activeGoal, context)
        ? activeGoal
        : goals.find((goal) => matchesContext(goal, context))
    ) ?? this.getDefaultGoal();
  }

  static loadGoalsForActiveContext() {
    const context = ReinaActiveContextService.getActiveContext();
    return this.loadGoals().filter((goal) => matchesContext(goal, context));
  }

  static getGoalById(id: string) {
    return this.loadGoals().find((goal) => goal.id === id) ?? null;
  }

  static saveGoal(goal: LiveGoal) {
    const context = ReinaActiveContextService.getActiveContext();
    const nextGoal = normalizeGoal({
      ...goal,
      profileId: goal.profileId ?? context.profileId,
      profileName: goal.profileName ?? context.profile?.name ?? null,
      characterId: goal.characterId ?? context.characterId,
      characterName: goal.characterName ?? context.character?.name ?? null,
      serverId: goal.serverId ?? context.serverId,
      updatedAt: Date.now()
    });
    const goals = this.loadGoals();
    const exists = goals.some((row) => row.id === nextGoal.id);
    const next = exists ? goals.map((row) => (row.id === nextGoal.id ? nextGoal : row)) : [nextGoal, ...goals];
    StorageService.set(LIVE_GOALS_KEY, next);
    StorageService.setString(ACTIVE_LIVE_GOAL_KEY, nextGoal.id);
    window.dispatchEvent(new Event("reinahub:live-goal-change"));
    return nextGoal;
  }

  static resetProgress(goal: LiveGoal) {
    return this.saveGoal({ ...goal, current: 0 });
  }

  static addProgress(goal: LiveGoal, amount: number) {
    return this.saveGoal({ ...goal, current: Math.max(0, Number(goal.current) + (Number(amount) || 0)) });
  }

  static addCreatureProgress(goal: LiveGoal, amount: number) {
    return this.saveGoal({ ...goal, creatureCurrent: Math.max(0, Number(goal.creatureCurrent) + (Number(amount) || 0)) });
  }

  static addBestiarySlot(goal: LiveGoal) {
    return normalizeGoal({
      ...goal,
      showCreatureGoal: true,
      bestiarySlots: [
        ...normalizeBestiarySlots(goal).slots,
        { id: `bestiary-${Date.now()}`, name: "Nova criatura", current: 0, total: 250 }
      ]
    });
  }

  static updateBestiarySlot(goal: LiveGoal, slotId: string, patch: Partial<LiveBestiarySlot>) {
    const slots = normalizeBestiarySlots(goal).slots.map((slot) => (
      slot.id === slotId ? normalizeBestiarySlot({ ...slot, ...patch }) : slot
    ));
    return normalizeGoal({ ...goal, bestiarySlots: slots, showCreatureGoal: slots.length > 0 });
  }

  static removeBestiarySlot(goal: LiveGoal, slotId: string) {
    const slots = normalizeBestiarySlots(goal).slots.filter((slot) => slot.id !== slotId);
    return normalizeGoal({ ...goal, bestiarySlots: slots, showCreatureGoal: slots.length > 0 });
  }

  static addBestiaryProgress(goal: LiveGoal, slotId: string, amount: number) {
    return this.updateBestiarySlot(goal, slotId, {
      current: Math.max(0, (goal.bestiarySlots ?? []).find((slot) => slot.id === slotId)?.current ?? 0) + (Number(amount) || 0)
    });
  }

  static createPremiumBestiaryPreset(goal: LiveGoal, server: VaultServer | null) {
    return normalizeGoal({
      ...goal,
      itemName: "Premium Time 30 dias",
      type: "premium",
      currency: server?.moeda === "Tibia Coin" || server?.tipo === "global" ? "Tibia Coin" : (server?.moeda as LiveGoalCurrency) || "Tibia Coin",
      total: 250,
      current: 0,
      showCreatureGoal: true,
      showGold: true,
      showBrl: true,
      customText: "Meta da live: juntar gold para Premium Time e completar bestiarios free.",
      bestiarySlots: [
        { id: "bestiary-spider", name: "Spider", current: 25, total: 250 },
        { id: "bestiary-minotaur", name: "Minotaur", current: 100, total: 500 },
        { id: "bestiary-rat", name: "Rat", current: 0, total: 250 }
      ]
    });
  }

  static calculate(goal: LiveGoal, server: VaultServer | null, serverNameOverride = ""): LiveGoalCalculation {
    const normalizedGoal = normalizeGoal(goal);
    const total = Math.max(0, normalizedGoal.total);
    const current = Math.max(0, normalizedGoal.current);
    const missing = Math.max(0, total - current);
    const progressPct = total > 0 ? clamp((current / total) * 100, 0, 100) : 0;
    const goldPerUnit = getGoldPerUnit(normalizedGoal.currency, server);

    return {
      goal: normalizedGoal,
      serverName: serverNameOverride || ReinaEconomyService.getDisplayName(server),
      currencyName: normalizedGoal.currency,
      unitLabel: getUnitLabel(normalizedGoal),
      isKillGoal: isKillGoal(normalizedGoal),
      total,
      current,
      missing,
      progressPct,
      totalGold: total * goldPerUnit,
      currentGold: current * goldPerUnit,
      missingGold: missing * goldPerUnit,
      totalBrlVenda: getBrlValue(server, normalizedGoal.currency, total),
      missingBrlVenda: getBrlValue(server, normalizedGoal.currency, missing),
      creatureGoal: getCreatureCalculation(normalizedGoal),
      bestiarySlots: getBestiaryCalculations(normalizedGoal)
    };
  }

  static goalFromSearchParams(searchParams: URLSearchParams, fallback: LiveGoal) {
    const hasParams = ["item", "total", "current", "currency", "server"].some((key) => searchParams.has(key));
    if (!hasParams) return normalizeGoal(fallback);

    return normalizeGoal({
      ...fallback,
      id: searchParams.get("id") || fallback.id,
      itemName: searchParams.get("item") || fallback.itemName,
      type: parseType(searchParams.get("type"), fallback.type),
      currency: parseCurrency(searchParams.get("currency"), fallback.currency),
      total: parseNumber(searchParams.get("total"), fallback.total),
      current: parseNumber(searchParams.get("current"), fallback.current),
      showCreatureGoal: parseBoolean(searchParams.get("showCreature"), fallback.showCreatureGoal),
      creatureName: searchParams.get("creature") || fallback.creatureName,
      creatureTotal: parseNumber(searchParams.get("creatureTotal"), fallback.creatureTotal),
      creatureCurrent: parseNumber(searchParams.get("creatureCurrent"), fallback.creatureCurrent),
      creatureImageUrl: searchParams.get("creatureImage") || fallback.creatureImageUrl,
      bestiarySlots: fallback.bestiarySlots,
      customText: searchParams.get("text") || fallback.customText,
      imageUrl: searchParams.get("image") || fallback.imageUrl,
      showBrl: parseBoolean(searchParams.get("showBrl"), fallback.showBrl),
      showGold: parseBoolean(searchParams.get("showGold"), fallback.showGold),
      theme: parseTheme(searchParams.get("theme"), fallback.theme)
    });
  }

  static toOverlayParams(goal: LiveGoal, server: VaultServer | null) {
    const params = new URLSearchParams();
    params.set("id", goal.id);
    params.set("live", "1");
    if (server) params.set("server", ReinaEconomyService.getDisplayName(server));
    return params.toString();
  }
}

function normalizeGoal(goal: LiveGoal): LiveGoal {
  return {
    ...defaultGoal,
    ...goal,
    id: goal.id || `live-goal-${Date.now()}`,
    profileId: goal.profileId ?? null,
    profileName: goal.profileName ?? null,
    characterId: goal.characterId ?? null,
    characterName: goal.characterName ?? null,
    serverId: goal.serverId ?? null,
    itemName: goal.itemName?.trim() || defaultGoal.itemName,
    total: Math.max(0, Number(goal.total) || 0),
    current: Math.max(0, Number(goal.current) || 0),
    showCreatureGoal: goal.showCreatureGoal ?? defaultGoal.showCreatureGoal,
    creatureName: goal.creatureName?.trim() || defaultGoal.creatureName,
    creatureTotal: Math.max(0, Number(goal.creatureTotal) || 0),
    creatureCurrent: Math.max(0, Number(goal.creatureCurrent) || 0),
    creatureImageUrl: goal.creatureImageUrl?.trim() || "",
    bestiarySlots: normalizeBestiarySlots(goal).slots,
    type: parseType(goal.type, defaultGoal.type),
    currency: parseCurrency(goal.currency, defaultGoal.currency),
    theme: parseTheme(goal.theme, defaultGoal.theme),
    showBrl: goal.showBrl ?? defaultGoal.showBrl,
    showGold: goal.showGold ?? defaultGoal.showGold,
    updatedAt: Number(goal.updatedAt) || Date.now()
  };
}

function matchesContext(goal: LiveGoal, context: ReturnType<typeof ReinaActiveContextService.getActiveContext>) {
  if (goal.profileId) return goal.profileId === context.profileId;
  if (goal.characterId) return goal.characterId === context.characterId;
  if (goal.serverId) return goal.serverId === context.serverId;
  return true;
}

function getGoldPerUnit(currency: LiveGoalCurrency, server: VaultServer | null) {
  if (currency === "kill") return 0;
  if (!server) return currency === "gold" ? 1 : 0;
  if (currency === "gold") return 1;
  if (currency === "real") return server.loteCompra > 0 ? server.gcPorMoeda / (server.loteCompra / server.lote) : 0;
  return server.gcPorMoeda;
}

function getBrlValue(server: VaultServer | null, currency: LiveGoalCurrency, value: number) {
  if (currency === "kill") return 0;
  if (!server) return 0;
  if (currency === "real") return value;
  if (currency === "gold") {
    const premium = server.gcPorMoeda > 0 ? value / server.gcPorMoeda : 0;
    return ReinaEconomyService.premiumToBrl(server, premium, "venda");
  }
  return ReinaEconomyService.premiumToBrl(server, value, "venda");
}

function parseType(value: unknown, fallback: LiveGoalType): LiveGoalType {
  return ["premium", "mount", "outfit", "bless", "item", "creature", "custom"].includes(String(value)) ? (value as LiveGoalType) : fallback;
}

function parseCurrency(value: unknown, fallback: LiveGoalCurrency): LiveGoalCurrency {
  return ["Tibia Coin", "RC", "gold", "real", "kill"].includes(String(value)) ? (value as LiveGoalCurrency) : fallback;
}

function parseTheme(value: unknown, fallback: LiveGoalTheme): LiveGoalTheme {
  return ["royal", "emerald", "arcane"].includes(String(value)) ? (value as LiveGoalTheme) : fallback;
}

function parseNumber(value: string | null, fallback: number) {
  if (value === null) return fallback;
  const normalized = value.replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? number : fallback;
}

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback;
  return value === "true" || value === "1" || value === "yes";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCreatureCalculation(goal: LiveGoal) {
  if (!goal.showCreatureGoal || goal.bestiarySlots?.length) return null;
  const total = Math.max(0, Number(goal.creatureTotal) || 0);
  const current = Math.max(0, Number(goal.creatureCurrent) || 0);
  const missing = Math.max(0, total - current);
  return {
    name: goal.creatureName,
    imageUrl: goal.creatureImageUrl,
    total,
    current,
    missing,
    progressPct: total > 0 ? clamp((current / total) * 100, 0, 100) : 0
  };
}

function getBestiaryCalculations(goal: LiveGoal) {
  if (!goal.showCreatureGoal) return [];
  return normalizeBestiarySlots(goal).slots.map((slot) => {
    const total = Math.max(0, Number(slot.total) || 0);
    const current = Math.max(0, Number(slot.current) || 0);
    const missing = Math.max(0, total - current);
    return {
      name: slot.name,
      imageUrl: slot.imageUrl ?? "",
      total,
      current,
      missing,
      progressPct: total > 0 ? clamp((current / total) * 100, 0, 100) : 0
    };
  });
}

function normalizeBestiarySlots(goal: LiveGoal) {
  const rawSlots = Array.isArray(goal.bestiarySlots) ? goal.bestiarySlots : [];
  if (rawSlots.length) {
    return { slots: rawSlots.map(normalizeBestiarySlot).filter((slot) => slot.name) };
  }
  if (goal.showCreatureGoal && goal.creatureName) {
    return {
      slots: [
        normalizeBestiarySlot({
          id: "bestiary-main",
          name: goal.creatureName,
          total: goal.creatureTotal,
          current: goal.creatureCurrent,
          imageUrl: goal.creatureImageUrl
        })
      ]
    };
  }
  return { slots: [] };
}

function normalizeBestiarySlot(slot: LiveBestiarySlot): LiveBestiarySlot {
  return {
    id: slot.id || `bestiary-${Date.now()}`,
    name: slot.name?.trim() || "Criatura",
    total: Math.max(0, Number(slot.total) || 0),
    current: Math.max(0, Number(slot.current) || 0),
    imageUrl: slot.imageUrl?.trim() || ""
  };
}

function isKillGoal(goal: LiveGoal) {
  return goal.type === "creature" || goal.currency === "kill";
}

function getUnitLabel(goal: LiveGoal) {
  if (isKillGoal(goal)) return "kills";
  return goal.currency;
}
