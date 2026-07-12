import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { itemLookupKey, loadManualMappings } from "./item-normalizer.mjs";

export function importNpcTrades(sourcePath, items = [], rawManualMappings = {}) {
  if (!sourcePath || !existsSync(sourcePath)) return { npcs: [], trades: [], unresolvedTrades: [], report: emptyReport(sourcePath) };

  const root = process.cwd();
  const files = collectLuaFiles(sourcePath);
  const itemIndex = buildItemIndex(items);
  const manualMappings = loadManualMappings(rawManualMappings);
  const npcByName = new Map();
  const trades = [];
  const unresolvedTrades = [];
  const parsedFiles = [];

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    const npcName = extractNpcName(content, filePath);
    const normalizedNpcName = itemLookupKey(npcName);
    const sourceRelativePath = path.relative(root, filePath);
    const entries = extractShopEntries(content);

    if (entries.length > 0) {
      npcByName.set(normalizedNpcName, {
        name: npcName,
        normalizedName: normalizedNpcName,
        sourcePath: sourceRelativePath
      });
    }

    let fileTradeCount = 0;
    for (const entry of entries) {
      const itemName = entry.itemName ?? entry.name;
      if (!itemName) continue;

      const resolvedItem = resolveItem(entry, itemName, itemIndex, manualMappings);
      const base = {
        npcName,
        normalizedNpcName,
        ...(resolvedItem?.id ? { itemId: resolvedItem.id } : {}),
        ...(entry.clientId ? { clientId: entry.clientId } : {}),
        itemName: resolvedItem?.name ?? itemName,
        count: entry.count,
        sourcePath: sourceRelativePath,
        dataStatus: resolvedItem ? "matched" : "unmatched"
      };

      if (entry.sell !== undefined) {
        const trade = {
          ...base,
          tradeType: "npcBuys",
          price: entry.sell
        };
        trades.push(trade);
        fileTradeCount += 1;
        if (!resolvedItem) unresolvedTrades.push(trade);
      }

      if (entry.buy !== undefined) {
        const trade = {
          ...base,
          tradeType: "npcSells",
          price: entry.buy
        };
        trades.push(trade);
        fileTradeCount += 1;
        if (!resolvedItem) unresolvedTrades.push(trade);
      }
    }

    if (entries.length > 0) {
      parsedFiles.push({
        path: sourceRelativePath,
        npcName,
        shopEntries: entries.length,
        trades: fileTradeCount
      });
    }
  }

  const npcs = Array.from(npcByName.values()).sort((a, b) => a.name.localeCompare(b.name));
  const sortedTrades = dedupeTrades(trades).sort((a, b) => a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName) || a.tradeType.localeCompare(b.tradeType));
  const sortedUnresolvedTrades = dedupeTrades(unresolvedTrades).sort((a, b) => a.npcName.localeCompare(b.npcName) || a.itemName.localeCompare(b.itemName));

  return {
    npcs,
    trades: sortedTrades,
    unresolvedTrades: sortedUnresolvedTrades,
    report: {
      sourcePath: path.relative(root, sourcePath),
      scannedLuaFiles: files.length,
      parsedNpcFiles: parsedFiles.length,
      npcCount: npcs.length,
      tradeCount: sortedTrades.length,
      unresolvedTradeCount: sortedUnresolvedTrades.length,
      unresolvedReview: buildUnresolvedReview(sortedUnresolvedTrades, itemIndex),
      tradeTypes: {
        npcBuys: sortedTrades.filter((trade) => trade.tradeType === "npcBuys").length,
        npcSells: sortedTrades.filter((trade) => trade.tradeType === "npcSells").length
      },
      parsedFiles
    }
  };
}

function collectLuaFiles(sourcePath) {
  const stats = statSync(sourcePath);
  if (stats.isFile()) return sourcePath.toLowerCase().endsWith(".lua") ? [sourcePath] : [];

  return readdirSync(sourcePath).flatMap((entry) => {
    const fullPath = path.join(sourcePath, entry);
    const entryStats = statSync(fullPath);
    if (entryStats.isDirectory()) return collectLuaFiles(fullPath);
    return fullPath.toLowerCase().endsWith(".lua") ? [fullPath] : [];
  });
}

function extractNpcName(content, filePath) {
  return (
    content.match(/local\s+internalNpcName\s*=\s*"([^"]+)"/)?.[1] ??
    content.match(/npcConfig\.name\s*=\s*"([^"]+)"/)?.[1] ??
    titleFromFile(filePath)
  );
}

function extractShopEntries(content) {
  const entries = [];
  let searchIndex = 0;

  while (searchIndex < content.length) {
    const assignmentIndex = content.indexOf("npcConfig.shop", searchIndex);
    if (assignmentIndex < 0) break;
    const equalsIndex = content.indexOf("=", assignmentIndex);
    const bodyStart = content.indexOf("{", equalsIndex);
    if (equalsIndex < 0 || bodyStart < 0) break;

    const bodyEnd = findMatchingBrace(content, bodyStart);
    if (bodyEnd < 0) break;

    const body = content.slice(bodyStart + 1, bodyEnd);
    for (const entryBody of splitTopLevelTables(body)) {
      const entry = parseShopEntry(entryBody);
      if (entry) entries.push(entry);
    }

    searchIndex = bodyEnd + 1;
  }

  return entries;
}

function findMatchingBrace(content, startIndex) {
  let depth = 0;
  let quote = null;

  for (let index = startIndex; index < content.length; index += 1) {
    const char = content[index];
    const previous = content[index - 1];

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return index;
    }
  }

  return -1;
}

function splitTopLevelTables(body) {
  const tables = [];
  let depth = 0;
  let quote = null;
  let start = null;

  for (let index = 0; index < body.length; index += 1) {
    const char = body[index];
    const previous = body[index - 1];

    if (quote) {
      if (char === quote && previous !== "\\") quote = null;
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== null) {
        tables.push(body.slice(start + 1, index));
        start = null;
      }
    }
  }

  return tables;
}

function parseShopEntry(entryBody) {
  const itemName = readStringProperty(entryBody, "itemName") ?? readStringProperty(entryBody, "itemname") ?? readStringProperty(entryBody, "name");
  const clientId = readNumberProperty(entryBody, "clientId") ?? readNumberProperty(entryBody, "clientid");
  const itemId = readNumberProperty(entryBody, "itemId") ?? readNumberProperty(entryBody, "itemid") ?? readNumberProperty(entryBody, "id");
  const buy = readNumberProperty(entryBody, "buy");
  const sell = readNumberProperty(entryBody, "sell");
  const count = readNumberProperty(entryBody, "count");

  if (!itemName && !clientId && !itemId) return null;
  if (buy === undefined && sell === undefined) return null;

  return {
    ...(itemName ? { itemName } : {}),
    ...(clientId ? { clientId } : {}),
    ...(itemId ? { itemId } : {}),
    ...(buy !== undefined ? { buy } : {}),
    ...(sell !== undefined ? { sell } : {}),
    ...(count ? { count } : {})
  };
}

function readStringProperty(body, property) {
  return (
    body.match(new RegExp(`(?:^|[^a-zA-Z0-9_])${property}\\s*=\\s*"([^"]+)"`, "i"))?.[1] ??
    body.match(new RegExp(`(?:^|[^a-zA-Z0-9_])${property}\\s*=\\s*'([^']+)'`, "i"))?.[1]
  );
}

function readNumberProperty(body, property) {
  const raw = body.match(new RegExp(`(?:^|[^a-zA-Z0-9_])${property}\\s*=\\s*(\\d+)`, "i"))?.[1];
  return raw ? Number(raw) : undefined;
}

function buildItemIndex(items) {
  const byId = new Map();
  const byClientId = new Map();
  const byName = new Map();

  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
    if (item.clientId && !byClientId.has(item.clientId)) byClientId.set(item.clientId, item);
    const key = itemLookupKey(item.name);
    if (!byName.has(key)) byName.set(key, item);
  }

  return { byId, byClientId, byName };
}

function resolveItem(entry, itemName, itemIndex, manualMappings) {
  const idAlias = entry.itemId ? manualMappings.itemIdAliases[String(entry.itemId)] : entry.clientId ? manualMappings.itemIdAliases[String(entry.clientId)] : undefined;
  const nameAlias = manualMappings.itemNameAliases[itemLookupKey(itemName)];

  return (
    (entry.itemId ? itemIndex.byId.get(entry.itemId) : null) ??
    (entry.clientId ? itemIndex.byId.get(entry.clientId) ?? itemIndex.byClientId.get(entry.clientId) : null) ??
    itemIndex.byName.get(itemLookupKey(itemName)) ??
    resolveManualTarget(idAlias ?? nameAlias, itemIndex) ??
    null
  );
}

function resolveManualTarget(target, itemIndex) {
  if (!target) return null;
  if (typeof target === "number") return itemIndex.byId.get(target) ?? itemIndex.byClientId.get(target) ?? null;
  if (typeof target === "string") return itemIndex.byName.get(itemLookupKey(target)) ?? null;
  if (typeof target !== "object") return null;

  if (target.itemId) return itemIndex.byId.get(target.itemId) ?? null;
  if (target.clientId) return itemIndex.byClientId.get(target.clientId) ?? null;
  if (target.itemName) return itemIndex.byName.get(itemLookupKey(target.itemName)) ?? null;
  return null;
}

function buildUnresolvedReview(unresolvedTrades, itemIndex) {
  const byItem = new Map();

  for (const trade of unresolvedTrades) {
    const key = `${trade.clientId ?? ""}:${itemLookupKey(trade.itemName)}`;
    const existing = byItem.get(key) ?? {
      itemName: trade.itemName,
      ...(trade.clientId ? { clientId: trade.clientId } : {}),
      occurrences: 0,
      npcNames: [],
      tradeTypes: [],
      prices: [],
      suggestedAction: trade.clientId ? "missing-item-source" : "review-name-alias",
      similarItemNames: trade.clientId ? [] : findSimilarItemNames(trade.itemName, itemIndex)
    };

    existing.occurrences += 1;
    if (!existing.npcNames.includes(trade.npcName)) existing.npcNames.push(trade.npcName);
    if (!existing.tradeTypes.includes(trade.tradeType)) existing.tradeTypes.push(trade.tradeType);
    if (!existing.prices.includes(trade.price)) existing.prices.push(trade.price);
    byItem.set(key, existing);
  }

  return {
    uniqueItems: byItem.size,
    totalOccurrences: unresolvedTrades.length,
    items: Array.from(byItem.values()).sort((a, b) => b.occurrences - a.occurrences || a.itemName.localeCompare(b.itemName))
  };
}

function findSimilarItemNames(itemName, itemIndex) {
  const key = itemLookupKey(itemName);
  if (!key) return [];

  const matches = [];
  for (const [candidateKey, item] of itemIndex.byName.entries()) {
    if (candidateKey === key) continue;
    if (candidateKey.includes(key) || key.includes(candidateKey)) {
      matches.push(item.name);
    }
    if (matches.length >= 5) break;
  }

  return matches;
}

function dedupeTrades(trades) {
  const byKey = new Map();
  for (const trade of trades) {
    const key = `${trade.npcName}:${trade.tradeType}:${trade.itemId ?? trade.clientId ?? itemLookupKey(trade.itemName)}:${trade.price}:${trade.count ?? ""}`;
    if (!byKey.has(key)) byKey.set(key, trade);
  }
  return Array.from(byKey.values());
}

function titleFromFile(filePath) {
  return path
    .basename(filePath, ".lua")
    .split(/[_-]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function emptyReport(sourcePath) {
  return {
    sourcePath: sourcePath ?? null,
    scannedLuaFiles: 0,
    parsedNpcFiles: 0,
    npcCount: 0,
    tradeCount: 0,
    unresolvedTradeCount: 0,
    tradeTypes: {
      npcBuys: 0,
      npcSells: 0
    },
    parsedFiles: []
  };
}
