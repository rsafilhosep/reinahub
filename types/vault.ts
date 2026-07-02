export type ServerKind = "global" | "ot";

export type VaultServer = {
  id: string;
  nome: string;
  plataforma?: string;
  mundo?: string;
  tipo: ServerKind;
  moeda: string;
  lote: number;
  gcPorMoeda: number;
  loteVenda: number;
  loteCompra: number;
};

export type QuoteSnapshot = {
  ts: number;
  nome: string;
  moeda: string;
  gcPorMoeda: number;
  unitVenda: number;
  unitCompra: number;
};

export type MarketAnalysis = {
  itemId?: number | null;
  itemImagePath?: string | null;
  nome: string;
  qtd: number;
  npcUnit: number;
  marketUnit: number;
  taxaPct: number;
  npcTotal: number;
  marketBruto: number;
  taxaValor: number;
  marketLiquido: number;
  diffAbs: number;
  diffPct: number;
  ts: number;
};

export type HuntMonster = {
  Name: string;
  Count: number;
};

export type HuntLootItem = {
  Name: string;
  Count: number;
  Id?: number;
  ID?: number;
  ItemId?: number;
  itemId?: number;
};

export type HuntSession = {
  Balance?: string | number;
  Loot?: string | number;
  Supplies?: string | number;
  XPGain?: string | number;
  XPGainHour?: string | number;
  RawXPGain?: string | number;
  Damage?: string | number;
  DamageHour?: string | number;
  Healing?: string | number;
  SessionLength?: string;
  SessionStart?: string;
  SessionEnd?: string;
  KilledMonsters?: HuntMonster[];
  LootedItems?: HuntLootItem[];
};

export type SpriteMeta = {
  status: "pending" | "ok" | "error";
  date: string | null;
  size?: number;
  error?: string;
};
