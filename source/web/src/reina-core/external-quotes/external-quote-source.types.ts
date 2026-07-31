export type ExternalQuoteSourceKind = "official" | "reseller" | "manual";

export type ExternalQuoteParser = "generic-brl-lot";

export type ExternalQuoteConfidence = "high" | "medium" | "low" | "none";

export type ExternalQuoteReadStatus = "ok" | "needs-review" | "manual-required" | "blocked" | "error";

export type ExternalQuoteSourceDefinition = {
  id: string;
  label: string;
  kind: ExternalQuoteSourceKind;
  url: string;
  platform: string;
  currency: string;
  lotSize: number;
  parser: ExternalQuoteParser;
  enabled: boolean;
  notes?: string;
};

export type ExternalQuoteDetectedAmount = {
  value: number;
  context: "player-sells" | "player-buys" | "unknown";
  snippet: string;
};

export type ExternalQuoteReadResult = {
  sourceId: string;
  label: string;
  kind: ExternalQuoteSourceKind;
  url: string;
  platform: string;
  currency: string;
  lotSize: number;
  status: ExternalQuoteReadStatus;
  confidence: ExternalQuoteConfidence;
  playerSellLotPrice: number | null;
  playerBuyLotPrice: number | null;
  detectedAmounts: ExternalQuoteDetectedAmount[];
  snippets: string[];
  message: string;
  fetchedAt: string;
};
