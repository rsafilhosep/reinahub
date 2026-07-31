import "server-only";

import type {
  ExternalQuoteDetectedAmount,
  ExternalQuoteReadResult,
  ExternalQuoteSourceDefinition
} from "./external-quote-source.types";
import { getExternalQuoteSource, listExternalQuoteSources } from "./external-quote-source-registry";

const REQUEST_TIMEOUT_MS = 9000;
const MAX_HTML_CHARS = 900_000;
const MAX_SNIPPETS = 6;

const browserHeaders = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  Pragma: "no-cache"
};

export class ExternalQuoteSourceService {
  static listSources(options?: { enabledOnly?: boolean }) {
    return listExternalQuoteSources(options);
  }

  static async checkAll(options?: { enabledOnly?: boolean }) {
    const sources = this.listSources({ enabledOnly: options?.enabledOnly ?? true });
    return Promise.all(sources.map((source) => this.checkSource(source.id)));
  }

  static async checkSource(sourceId: string): Promise<ExternalQuoteReadResult> {
    const source = getExternalQuoteSource(sourceId);
    if (!source) {
      const fetchedAt = new Date().toISOString();
      return {
        sourceId,
        label: sourceId,
        kind: "manual",
        url: "",
        platform: "",
        currency: "",
        lotSize: 25,
        status: "error",
        confidence: "none",
        playerSellLotPrice: null,
        playerBuyLotPrice: null,
        detectedAmounts: [],
        snippets: [],
        message: "Fonte nao cadastrada no ReinaHub.",
        fetchedAt
      };
    }

    const fetchedAt = new Date().toISOString();
    if (!isSafeHttpUrl(source.url)) {
      return emptyResult(source, "blocked", "URL bloqueada: apenas http/https sao permitidos.", fetchedAt);
    }

    try {
      const structuredResult = await readStructuredQuote(source, fetchedAt);
      if (structuredResult) return structuredResult;

      const html = await fetchHtml(source.url);
      const text = htmlToText(html);
      const detectedAmounts = detectBrlAmounts(text);
      const snippets = pickSnippets(text, detectedAmounts);
      const playerSellLotPrice = chooseAmount(detectedAmounts, "player-sells");
      const playerBuyLotPrice = chooseAmount(detectedAmounts, "player-buys");
      const hasPrice = playerSellLotPrice !== null || playerBuyLotPrice !== null;
      const ambiguous = detectedAmounts.length > 0 && !hasPrice;

      return {
        sourceId: source.id,
        label: source.label,
        kind: source.kind,
        url: source.url,
        platform: source.platform,
        currency: source.currency,
        lotSize: source.lotSize,
        status: hasPrice ? "needs-review" : ambiguous ? "needs-review" : "manual-required",
        confidence: hasPrice ? "medium" : ambiguous ? "low" : "none",
        playerSellLotPrice,
        playerBuyLotPrice,
        detectedAmounts,
        snippets,
        message: getResultMessage(hasPrice, ambiguous),
        fetchedAt
      };
    } catch (error) {
      return emptyResult(
        source,
        "error",
        error instanceof Error ? error.message : "Nao foi possivel consultar a fonte externa.",
        fetchedAt
      );
    }
  }
}

async function fetchHtml(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: browserHeaders,
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Fonte respondeu HTTP ${response.status}.`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !contentType.includes("text/html") && !contentType.includes("text/plain")) {
      throw new Error("Fonte nao retornou HTML/texto analisavel.");
    }

    const html = await response.text();
    return html.slice(0, MAX_HTML_CHARS);
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        ...browserHeaders,
        Accept: "application/json,text/plain,*/*"
      },
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Endpoint respondeu HTTP ${response.status}.`);
    }

    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function readStructuredQuote(source: ExternalQuoteSourceDefinition, fetchedAt: string): Promise<ExternalQuoteReadResult | null> {
  if (source.id === "tibiapay-tibia" || source.id === "tibiapay-rubini") {
    const products = await fetchJson("https://tibiapay.com.br/api/products");
    const productList = Array.isArray(products) ? products : [];
    const slug = source.id === "tibiapay-tibia" ? "tibia-coins" : "rubini-coins";
    const product = productList.find((item: Record<string, unknown>) => item.slug === slug);
    const currentPrice = parseLooseNumber(product?.current_price);
    const unitQuantity = parseLooseNumber(product?.unit_quantity) || source.lotSize;
    if (!currentPrice) return null;
    const priceForSourceLot = currentPrice * (source.lotSize / unitQuantity);
    return {
      sourceId: source.id,
      label: source.label,
      kind: source.kind,
      url: source.url,
      platform: source.platform,
      currency: source.currency,
      lotSize: source.lotSize,
      status: "needs-review",
      confidence: "high",
      playerSellLotPrice: Number(priceForSourceLot.toFixed(6)),
      playerBuyLotPrice: null,
      detectedAmounts: [
        {
          value: Number(priceForSourceLot.toFixed(6)),
          context: "player-sells",
          snippet: `Endpoint publico /api/products: ${product?.name ?? source.currency} por ${unitQuantity} moedas.`
        }
      ],
      snippets: [`TibiaPay informa R$ ${priceForSourceLot.toFixed(3).replace(".", ",")} por ${source.lotSize} ${source.currency}.`],
      message: "Cotacao estruturada encontrada. Jogador vende moedas e recebe reais. Revise antes de salvar.",
      fetchedAt
    };
  }

  if (source.id === "coins4gamers-tibia" || source.id === "coins4gamers-rubinot") {
    const config = await fetchJson("https://coins4gamers.com.br/api/public/config") as Record<string, unknown>;
    const rawPrice = source.id === "coins4gamers-tibia" ? config.tibiaPrice : config.rubinotPrice;
    const baseQuantity = source.id === "coins4gamers-tibia" ? 25 : 250;
    const currentPrice = parseLooseNumber(rawPrice);
    if (!currentPrice) return null;
    const priceForSourceLot = currentPrice * (source.lotSize / baseQuantity);
    return {
      sourceId: source.id,
      label: source.label,
      kind: source.kind,
      url: source.url,
      platform: source.platform,
      currency: source.currency,
      lotSize: source.lotSize,
      status: "needs-review",
      confidence: "high",
      playerSellLotPrice: null,
      playerBuyLotPrice: Number(priceForSourceLot.toFixed(6)),
      detectedAmounts: [
        {
          value: Number(priceForSourceLot.toFixed(6)),
          context: "player-buys",
          snippet: `Endpoint publico /api/public/config: preco base por ${baseQuantity} moedas.`
        }
      ],
      snippets: [`Coins4Gamers informa R$ ${priceForSourceLot.toFixed(3).replace(".", ",")} por ${source.lotSize} ${source.currency}.`],
      message: "Cotacao estruturada encontrada. Jogador compra moedas e paga reais. Revise antes de salvar.",
      fetchedAt
    };
  }

  return null;
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(?:x[0-9a-f]+|\d+);/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectBrlAmounts(text: string): ExternalQuoteDetectedAmount[] {
  const amounts: ExternalQuoteDetectedAmount[] = [];
  const regex = /R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:,[0-9]+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    const value = parseBrl(match[1]);
    if (!Number.isFinite(value) || value <= 0) continue;
    const snippet = getSnippet(text, match.index, 130);
    amounts.push({
      value,
      context: classifyContext(snippet),
      snippet
    });
  }

  return dedupeAmounts(amounts).slice(0, 12);
}

function classifyContext(snippet: string): ExternalQuoteDetectedAmount["context"] {
  const normalized = normalizeText(snippet);
  if (/\b(venda|vender|venda suas|voce recebe|voce recebera|receba|recebe)\b/.test(normalized)) return "player-sells";
  if (/\b(compra|comprar|comprar coins|voce paga|pagar|checkout|produto|carrinho)\b/.test(normalized)) return "player-buys";
  return "unknown";
}

function chooseAmount(amounts: ExternalQuoteDetectedAmount[], context: ExternalQuoteDetectedAmount["context"]) {
  const matches = amounts.filter((amount) => amount.context === context);
  if (!matches.length) return null;
  return matches[0].value;
}

function pickSnippets(text: string, amounts: ExternalQuoteDetectedAmount[]) {
  const amountSnippets = amounts.map((amount) => amount.snippet);
  const keywords = ["cotacao", "cotacao", "vender", "comprar", "voce recebe", "voce paga", "coins"];
  const keywordSnippets = keywords
    .map((keyword) => {
      const index = normalizeText(text).indexOf(keyword);
      return index >= 0 ? getSnippet(text, index, 120) : "";
    })
    .filter(Boolean);

  return Array.from(new Set([...amountSnippets, ...keywordSnippets])).slice(0, MAX_SNIPPETS);
}

function getResultMessage(hasPrice: boolean, ambiguous: boolean) {
  if (hasPrice) return "Valor candidato encontrado. Revise antes de salvar ou aplicar.";
  if (ambiguous) return "Valores em R$ foram encontrados, mas sem contexto claro de compra/venda.";
  return "Nao encontrei uma cotacao clara. Use cadastro manual para essa fonte.";
}

function emptyResult(
  source: ExternalQuoteSourceDefinition,
  status: ExternalQuoteReadResult["status"],
  message: string,
  fetchedAt: string
): ExternalQuoteReadResult {
  return {
    sourceId: source.id,
    label: source.label,
    kind: source.kind,
    url: source.url,
    platform: source.platform,
    currency: source.currency,
    lotSize: source.lotSize,
    status,
    confidence: "none",
    playerSellLotPrice: null,
    playerBuyLotPrice: null,
    detectedAmounts: [],
    snippets: [],
    message,
    fetchedAt
  };
}

function parseBrl(value: string) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}

function parseLooseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const normalized = value.trim().replace(/\./g, ".").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getSnippet(text: string, index: number, radius: number) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function dedupeAmounts(amounts: ExternalQuoteDetectedAmount[]) {
  const seen = new Set<string>();
  return amounts.filter((amount) => {
    const key = `${amount.context}:${amount.value}:${amount.snippet.slice(0, 40)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isSafeHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
