const BACKUP_FORMAT = "reinahub-backup";
const BACKUP_VERSION = 1;
const RECOVERY_KEY = "reinahub_backup_recovery_v1";

const MANAGED_KEYS = new Set([
  "vot_servers", "vot_active_server", "vot_quote_history", "vot_theme",
  "reinahub_manual_price_sources", "reinahub_profiles", "reinahub_active_profile",
  "reinahub_character_profiles", "reinahub_active_character", "reinahub_hunt_history",
  "reinahub_item_price_memory_v1", "reinahub_live_goals", "reinahub_active_live_goal",
  "reinahub_premium_product_overrides", "reinahub_premium_goal_progress",
  "reinahub_help_enabled", "reinahub_sidebar_collapsed", "reinahub_first_run_v5",
  "reinahub_cookie_consent_v1", "rc_history", "ma_history", "imbuement_market_prices",
  "imbuement_market_snapshots"
]);

const MANAGED_PREFIXES = ["reinahub_stash_items_profile_", "imbuement_market_prices:"];

export type ReinaHubBackup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  createdAt: string;
  app: "ReinaHub";
  entries: Record<string, string>;
};

export type BackupSummary = {
  createdAt: string;
  entryCount: number;
  sizeBytes: number;
  categories: Array<{ label: string; count: number }>;
};

export const BackupService = {
  create(): ReinaHubBackup {
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      app: "ReinaHub",
      entries: collectManagedEntries()
    };
  },

  download(backup: ReinaHubBackup) {
    const content = JSON.stringify(backup, null, 2);
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reinahub-backup-${backup.createdAt.slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  parse(content: string): ReinaHubBackup {
    const parsed = JSON.parse(content) as Partial<ReinaHubBackup>;
    if (parsed.format !== BACKUP_FORMAT || parsed.app !== "ReinaHub") throw new Error("Este arquivo não é um backup válido do ReinaHub.");
    if (parsed.version !== BACKUP_VERSION) throw new Error("Esta versão de backup ainda não é compatível.");
    if (!parsed.createdAt || !parsed.entries || typeof parsed.entries !== "object" || Array.isArray(parsed.entries)) throw new Error("O arquivo está incompleto ou corrompido.");
    const entries = Object.fromEntries(Object.entries(parsed.entries).filter(([key, value]) => isManagedKey(key) && typeof value === "string"));
    if (!Object.keys(entries).length) throw new Error("Nenhum dado restaurável foi encontrado no arquivo.");
    return { format: BACKUP_FORMAT, version: BACKUP_VERSION, createdAt: parsed.createdAt, app: "ReinaHub", entries };
  },

  summarize(backup: ReinaHubBackup): BackupSummary {
    const keys = Object.keys(backup.entries);
    const groups = new Map<string, number>();
    keys.forEach((key) => groups.set(categoryForKey(key), (groups.get(categoryForKey(key)) ?? 0) + 1));
    return {
      createdAt: backup.createdAt,
      entryCount: keys.length,
      sizeBytes: new Blob([JSON.stringify(backup)]).size,
      categories: Array.from(groups, ([label, count]) => ({ label, count })).sort((a, b) => a.label.localeCompare(b.label))
    };
  },

  replace(backup: ReinaHubBackup) {
    const recovery = this.create();
    window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(recovery));
    try {
      listManagedKeys().forEach((key) => window.localStorage.removeItem(key));
      Object.entries(backup.entries).forEach(([key, value]) => window.localStorage.setItem(key, value));
    } catch (error) {
      restoreEntries(recovery.entries);
      throw error;
    }
  },

  getRecovery(): ReinaHubBackup | null {
    try {
      const raw = window.localStorage.getItem(RECOVERY_KEY);
      return raw ? this.parse(raw) : null;
    } catch {
      return null;
    }
  },

  restoreRecovery() {
    const recovery = this.getRecovery();
    if (!recovery) throw new Error("Nenhuma cópia de recuperação está disponível.");
    listManagedKeys().forEach((key) => window.localStorage.removeItem(key));
    restoreEntries(recovery.entries);
  }
};

function collectManagedEntries() {
  const entries: Record<string, string> = {};
  listManagedKeys().forEach((key) => {
    const value = window.localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  });
  return entries;
}

function listManagedKeys() {
  return Array.from({ length: window.localStorage.length }, (_, index) => window.localStorage.key(index))
    .filter((key): key is string => Boolean(key && isManagedKey(key)));
}

function isManagedKey(key: string) {
  return MANAGED_KEYS.has(key) || MANAGED_PREFIXES.some((prefix) => key.startsWith(prefix));
}

function restoreEntries(entries: Record<string, string>) {
  Object.entries(entries).forEach(([key, value]) => window.localStorage.setItem(key, value));
}

function categoryForKey(key: string) {
  if (/profile|character/.test(key)) return "Perfis e personagens";
  if (/server|quote|price_source/.test(key)) return "Servidores e cotações";
  if (/stash|item_price/.test(key)) return "Stash e preços";
  if (/hunt|ma_history|rc_history/.test(key)) return "Históricos e análises";
  if (/goal|premium/.test(key)) return "Metas";
  if (/imbuement/.test(key)) return "Imbuements";
  return "Preferências";
}
