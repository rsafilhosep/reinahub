import type { ExternalQuoteSourceDefinition } from "./external-quote-source.types";

export const EXTERNAL_QUOTE_SOURCES: ExternalQuoteSourceDefinition[] = [
  {
    id: "tibiapay-tibia",
    label: "TibiaPay - Tibia Coins",
    kind: "reseller",
    url: "https://tibiapay.com.br/",
    platform: "Tibia Global",
    currency: "Tibia Coin",
    lotSize: 25,
    parser: "generic-brl-lot",
    enabled: true,
    notes: "Referencia externa para jogador vender Tibia Coins. Revisar antes de aplicar."
  },
  {
    id: "tibiapay-rubini",
    label: "TibiaPay - Rubini Coins",
    kind: "reseller",
    url: "https://tibiapay.com.br/",
    platform: "RubinOT",
    currency: "Rubini Coin",
    lotSize: 25,
    parser: "generic-brl-lot",
    enabled: true,
    notes: "Referencia externa para jogador vender Rubini Coins. Revisar antes de aplicar."
  },
  {
    id: "coins4gamers-tibia",
    label: "Coins4Gamers - Tibia Coins",
    kind: "reseller",
    url: "https://coins4gamers.com.br/tibia/tibia-coins",
    platform: "Tibia Global",
    currency: "Tibia Coin",
    lotSize: 25,
    parser: "generic-brl-lot",
    enabled: true,
    notes: "Referencia externa para Tibia Coins. Revisar antes de aplicar."
  },
  {
    id: "coins4gamers-rubinot",
    label: "Coins4Gamers - Rubini Coins",
    kind: "reseller",
    url: "https://coins4gamers.com.br/rubinot/rubinot-coins",
    platform: "RubinOT",
    currency: "Rubini Coin",
    lotSize: 25,
    parser: "generic-brl-lot",
    enabled: true,
    notes: "Referencia externa para Rubini Coins. Revisar antes de aplicar."
  }
];

export function listExternalQuoteSources(options?: { enabledOnly?: boolean }) {
  if (options?.enabledOnly === false) return EXTERNAL_QUOTE_SOURCES;
  return EXTERNAL_QUOTE_SOURCES.filter((source) => source.enabled);
}

export function getExternalQuoteSource(sourceId: string) {
  return EXTERNAL_QUOTE_SOURCES.find((source) => source.id === sourceId);
}
