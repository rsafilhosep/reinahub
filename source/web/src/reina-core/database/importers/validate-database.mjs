import { itemLookupKey, loadManualMappings } from "./item-normalizer.mjs";

export function validateDatabase({ items, npcSellPrices, monsterLoot, manualMappings = {} }) {
  const index = buildItemIndex(items);
  const mappings = loadManualMappings(manualMappings);

  const duplicateItemIds = [...index.itemIds.entries()].filter(([, values]) => values.length > 1).map(([id]) => Number(id));
  const duplicateItemNames = [...index.itemNames.entries()].filter(([, values]) => values.length > 1).map(([, values]) => values[0].name);

  const lootMatches = monsterLoot.map((loot) => ({ ref: loot, match: resolveItemReference(loot, index, mappings) }));
  const npcMatches = npcSellPrices.map((price) => ({ ref: price, match: resolveItemReference(price, index, mappings) }));

  const lootWithoutItem = lootMatches.filter((entry) => !entry.match).map((entry) => entry.ref);
  const npcPricesWithoutItem = npcMatches.filter((entry) => !entry.match).map((entry) => entry.ref);
  const allMatches = [...lootMatches, ...npcMatches];
  const resolvedAutomatically = allMatches.filter((entry) => entry.match && entry.match.method !== "manualMapping").length;
  const resolvedByManualMapping = allMatches.filter((entry) => entry.match?.method === "manualMapping").length;
  const unresolvedItems = [
    ...lootWithoutItem.map((ref) => ({ source: "monster-loot", ...ref })),
    ...npcPricesWithoutItem.map((ref) => ({ source: "npc-sell-prices", ...ref }))
  ];

  return {
    duplicateItemNames,
    duplicateItemIds,
    lootWithoutItem,
    npcPricesWithoutItem,
    unresolvedItems,
    resolutionSummary: {
      totalReferences: monsterLoot.length + npcSellPrices.length,
      resolvedAutomatically,
      resolvedByManualMapping,
      unresolved: unresolvedItems.length,
      pendingLoot: lootWithoutItem.length,
      pendingNpcPrices: npcPricesWithoutItem.length
    }
  };
}

export function resolveItemReference(ref, index, mappings = loadManualMappings({})) {
  if (ref.itemId && index.itemIds.has(ref.itemId)) return { method: "itemId", item: index.itemIds.get(ref.itemId)[0] };
  if (ref.itemId && index.clientIds.has(ref.itemId)) return { method: "clientId", item: index.clientIds.get(ref.itemId)[0] };

  const idAlias = ref.itemId ? mappings.itemIdAliases[String(ref.itemId)] : undefined;
  const idAliasMatch = idAlias ? resolveManualTarget(idAlias, index) : null;
  if (idAliasMatch) return { method: "manualMapping", item: idAliasMatch };

  if (ref.itemName) {
    const key = itemLookupKey(ref.itemName);
    if (index.itemNames.has(key)) return { method: "normalizedName", item: index.itemNames.get(key)[0] };

    const target = mappings.itemNameAliases[key];
    const manualMatch = target ? resolveManualTarget(target, index) : null;
    if (manualMatch) return { method: "manualMapping", item: manualMatch };
  }

  return null;
}

function pushMap(map, key, value) {
  const list = map.get(key) ?? [];
  list.push(value);
  map.set(key, list);
}

function buildItemIndex(items) {
  const itemIds = new Map();
  const clientIds = new Map();
  const itemNames = new Map();

  for (const item of items) {
    pushMap(itemIds, item.id, item);
    if (item.clientId) pushMap(clientIds, item.clientId, item);
    pushMap(itemNames, itemLookupKey(item.name), item);
  }

  return { itemIds, clientIds, itemNames };
}

function resolveManualTarget(target, index) {
  if (typeof target === "number") return index.itemIds.get(target)?.[0] ?? index.clientIds.get(target)?.[0] ?? null;
  if (typeof target === "string") return index.itemNames.get(itemLookupKey(target))?.[0] ?? null;
  if (!target || typeof target !== "object") return null;

  if (target.itemId && index.itemIds.has(target.itemId)) return index.itemIds.get(target.itemId)[0];
  if (target.clientId && index.clientIds.has(target.clientId)) return index.clientIds.get(target.clientId)[0];
  if (target.itemName && index.itemNames.has(itemLookupKey(target.itemName))) return index.itemNames.get(itemLookupKey(target.itemName))[0];
  return null;
}
