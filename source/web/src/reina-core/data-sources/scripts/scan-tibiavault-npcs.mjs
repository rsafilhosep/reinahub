import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const rootDir = process.cwd();
const sourceUrl = "https://tibiavault.com/#npcs";
const homeUrl = "https://tibiavault.com/";
const generatedDir = path.join(rootDir, "source", "web", "src", "reina-core", "data-sources", "generated");
const databaseDir = path.join(rootDir, "source", "web", "src", "reina-core", "database", "generated");

await fs.mkdir(generatedDir, { recursive: true });

const generatedAt = new Date().toISOString();
const homeFetch = await fetchTextWithTlsFallback(sourceUrl);
const npcScriptUrl = findNpcScriptUrl(homeFetch.text);
const npcScriptFetch = await fetchTextWithTlsFallback(npcScriptUrl);
const rawNpcs = parseNpcData(npcScriptFetch.text);
const localItems = await readJsonIfExists(path.join(databaseDir, "items.json"), []);
const supplementalItems = await readJsonIfExists(path.join(databaseDir, "supplemental-items.json"), []);
const localNpcs = await readJsonIfExists(path.join(databaseDir, "npcs.json"), []);
const allItems = mergeItems(localItems, supplementalItems);
const itemsByName = new Map(allItems.map((item) => [lookupKey(item.name), item]));
const localNpcsByName = new Map(localNpcs.map((npc) => [lookupKey(npc.name), npc]));

const normalizedNpcs = rawNpcs.map(normalizeNpc);
const itemLinks = [];
const unresolvedItems = [];

for (const npc of normalizedNpcs) {
  for (const tradeType of ["itemsBought", "itemsSold"]) {
    for (const trade of npc[tradeType]) {
      const item = itemsByName.get(lookupKey(trade.itemName));
      const row = {
        npcName: npc.name,
        city: npc.city,
        tradeType,
        itemName: trade.itemName,
        price: trade.price,
        sourceUrl: npc.sourceUrl
      };

      if (item) {
        itemLinks.push({
          ...row,
          itemId: item.id,
          clientId: item.clientId ?? null,
          localItemName: item.name,
          status: "matched"
        });
      } else {
        unresolvedItems.push({
          ...row,
          normalizedItemName: lookupKey(trade.itemName),
          reviewStatus: "manual-review-required"
        });
      }
    }
  }
}

const matchedNpcs = normalizedNpcs
  .filter((npc) => localNpcsByName.has(lookupKey(npc.name)))
  .map((npc) => ({
    name: npc.name,
    city: npc.city,
    sourceUrl: npc.sourceUrl,
    localName: localNpcsByName.get(lookupKey(npc.name))?.name ?? npc.name
  }));

const sourceOnlyNpcs = normalizedNpcs
  .filter((npc) => !localNpcsByName.has(lookupKey(npc.name)))
  .map((npc) => ({
    name: npc.name,
    city: npc.city,
    roles: npc.roles,
    itemsBought: npc.itemsBought.length,
    itemsSold: npc.itemsSold.length,
    sourceUrl: npc.sourceUrl,
    reviewStatus: "candidate"
  }));

const localOnlyNpcs = localNpcs
  .filter((npc) => !normalizedNpcs.some((sourceNpc) => lookupKey(sourceNpc.name) === lookupKey(npc.name)))
  .map((npc) => ({
    name: npc.name,
    city: npc.city ?? null,
    sourcePath: npc.sourcePath ?? null
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const rawReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  scriptUrl: npcScriptUrl,
  safety: "Text scan only. JavaScript is parsed as data text and never executed.",
  fetch: {
    home: summarizeFetch(homeFetch),
    script: summarizeFetch(npcScriptFetch)
  },
  totalNpcs: rawNpcs.length,
  npcs: rawNpcs
};

const normalizedReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  scriptUrl: npcScriptUrl,
  safety: "Normalized reference data only. Not imported into ReinaDataService.",
  totalNpcs: normalizedNpcs.length,
  npcs: normalizedNpcs
};

const coverageReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  scriptUrl: npcScriptUrl,
  safety: "Coverage report only. Use this before promoting data to local database importers.",
  totals: {
    sourceNpcs: normalizedNpcs.length,
    localNpcs: localNpcs.length,
    matchedNpcs: matchedNpcs.length,
    sourceOnlyNpcs: sourceOnlyNpcs.length,
    localOnlyNpcs: localOnlyNpcs.length,
    sourceNpcTrades: itemLinks.length + unresolvedItems.length,
    matchedItemsInTrades: itemLinks.length,
    unresolvedItemsInTrades: unresolvedItems.length,
    itemMatchPct: itemLinks.length + unresolvedItems.length
      ? Number(((itemLinks.length / (itemLinks.length + unresolvedItems.length)) * 100).toFixed(2))
      : 0
  },
  matchedNpcs,
  sourceOnlyNpcs,
  localOnlyNpcs,
  matchedTrades: itemLinks
};

const unresolvedReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  scriptUrl: npcScriptUrl,
  safety: "Manual review list. Do not import unresolved rows automatically.",
  total: unresolvedItems.length,
  items: unresolvedItems.sort((a, b) => a.itemName.localeCompare(b.itemName) || a.npcName.localeCompare(b.npcName))
};

await writeJson("tibiavault-npcs-raw.json", rawReport);
await writeJson("tibiavault-npcs-normalized.json", normalizedReport);
await writeJson("tibiavault-npcs-coverage.json", coverageReport);
await writeJson("tibiavault-npc-unresolved-items.json", unresolvedReport);

console.log("TibiaVault NPC scan complete");
console.log(coverageReport.totals);

function findNpcScriptUrl(html) {
  const scriptMatch = html.match(/<script[^>]+src=["']([^"']*js\/npc-data\.js[^"']*)["']/i);
  if (!scriptMatch?.[1]) {
    throw new Error("Could not find TibiaVault npc-data.js script.");
  }
  return new URL(scriptMatch[1], homeUrl).toString();
}

function parseNpcData(sourceText) {
  const arrayLiteral = extractJsArrayLiteral(sourceText, "const _NPC_DATA");
  const jsonText = jsObjectLiteralToJson(arrayLiteral);
  return JSON.parse(jsonText);
}

function extractJsArrayLiteral(sourceText, marker) {
  const text = stripComments(sourceText);
  const markerIndex = text.indexOf(marker);
  if (markerIndex < 0) throw new Error(`Marker not found: ${marker}`);

  const start = text.indexOf("[", markerIndex);
  if (start < 0) throw new Error(`Array start not found for: ${marker}`);

  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }

  throw new Error(`Array end not found for: ${marker}`);
}

function jsObjectLiteralToJson(value) {
  return value
    .replace(/([{,]\s*)([A-Za-z_$][\w$]*)(\s*:)/g, '$1"$2"$3')
    .replace(/,\s*([}\]])/g, "$1");
}

function normalizeNpc(npc) {
  const sourcePath = `#npcs/${slugify(npc.name)}`;
  const itemsBought = normalizeTrades(npc.buys);
  const itemsSold = normalizeTrades(npc.sells);

  return {
    name: npc.name,
    normalizedName: lookupKey(npc.name),
    city: npc.city ?? null,
    location: npc.loc ?? null,
    roles: Array.isArray(npc.role) ? npc.role : [],
    itemsBought,
    itemsSold,
    transport: Array.isArray(npc.transport) ? npc.transport : [],
    quest: npc.quest ?? null,
    notes: npc.notes ?? null,
    source: "tibiavault",
    sourceUrl: new URL(sourcePath, homeUrl).toString(),
    reviewStatus: "external-reference"
  };
}

function normalizeTrades(rows) {
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => ({
      itemName: row.n,
      normalizedItemName: lookupKey(row.n),
      price: Number.isFinite(Number(row.p)) ? Number(row.p) : null
    }))
    .filter((row) => row.itemName)
    .sort((a, b) => a.itemName.localeCompare(b.itemName) || (a.price ?? 0) - (b.price ?? 0));
}

function mergeItems(primaryItems, extraItems) {
  const byId = new Set(primaryItems.flatMap((item) => [item.id, item.clientId].filter(Boolean)));
  const byName = new Set(primaryItems.map((item) => lookupKey(item.name)));
  const merged = [...primaryItems];

  for (const item of extraItems) {
    if (byId.has(item.id) || (item.clientId && byId.has(item.clientId)) || byName.has(lookupKey(item.name))) continue;
    merged.push(item);
    byId.add(item.id);
    if (item.clientId) byId.add(item.clientId);
    byName.add(lookupKey(item.name));
  }

  return merged;
}

function stripComments(value) {
  return value
    .replace(/\/\/.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function lookupKey(value = "") {
  return decodeHtml(String(value))
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[â€˜â€™Â´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value) {
  return lookupKey(value).replace(/\s+/g, "-");
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function fetchTextWithTlsFallback(url) {
  try {
    return await fetchText(url, true);
  } catch (error) {
    const fallback = await fetchText(url, false);
    return {
      ...fallback,
      tlsMode: "certificate-verification-disabled",
      tlsWarning: error instanceof Error ? error.message : "TLS verification failed"
    };
  }
}

function fetchText(url, rejectUnauthorized) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized,
        headers: {
          "User-Agent": "ReinaHub datasource scanner (controlled report only)",
          Accept: "text/html,application/javascript"
        }
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((response.statusCode ?? 0) >= 400) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          resolve({
            text,
            statusCode: response.statusCode,
            tlsMode: rejectUnauthorized ? "verified" : "certificate-verification-disabled"
          });
        });
      }
    );
    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error("Request timed out"));
    });
  });
}

function summarizeFetch(fetchResult) {
  return {
    statusCode: fetchResult.statusCode,
    tlsMode: fetchResult.tlsMode,
    tlsWarning: fetchResult.tlsWarning ?? null,
    contentLength: fetchResult.text.length
  };
}

async function readJsonIfExists(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(fileName, payload) {
  await fs.writeFile(path.join(generatedDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
