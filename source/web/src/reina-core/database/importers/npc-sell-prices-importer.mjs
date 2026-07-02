import { extractTags, parseAttributes, readText, toNumber } from "./xml-utils.mjs";

export function importNpcSellPrices(npcPath) {
  if (!npcPath) return [];
  const xml = readText(npcPath);
  const prices = [];

  importShopItemTags(xml, prices);
  importShopSellableParameters(xml, prices);

  return dedupePrices(prices);
}

function importShopItemTags(xml, prices) {
  for (const block of extractTags(xml, "item")) {
    const attrs = parseAttributes(block.match(/^<item\b[^>]*>/i)?.[0] ?? block);
    const sellPrice = toNumber(attrs.sell ?? attrs.sellprice ?? attrs.price);
    if (!sellPrice) continue;

    const itemId = toNumber(attrs.id ?? attrs.itemid);
    const itemName = attrs.name;
    prices.push({
      ...(itemId ? { itemId } : {}),
      ...(itemName ? { itemName } : {}),
      sellPrice
    });
  }
}

function importShopSellableParameters(xml, prices) {
  for (const paramTag of xml.matchAll(/<parameter\b[^>]*(?:\/>|>[\s\S]*?<\/parameter>)/gi)) {
    const attrs = parseAttributes(paramTag[0]);
    const key = String(attrs.key ?? "").toLowerCase();
    if (!key.includes("sell")) continue;
    const value = attrs.value ?? "";
    parseSellableList(value).forEach((price) => prices.push(price));
  }
}

function parseSellableList(value) {
  return String(value)
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const parts = entry.split(",").map((part) => part.trim()).filter(Boolean);
      if (parts.length < 2) return null;
      const sellPrice = toNumber(parts.at(-1));
      if (!sellPrice) return null;
      const maybeId = toNumber(parts.at(-2));
      const name = parts.slice(0, maybeId ? -2 : -1).join(",");
      return {
        ...(maybeId ? { itemId: maybeId } : {}),
        ...(name ? { itemName: name } : {}),
        sellPrice
      };
    })
    .filter(Boolean);
}

function dedupePrices(prices) {
  const byKey = new Map();
  for (const price of prices) {
    const key = price.itemId ? `id:${price.itemId}` : `name:${String(price.itemName ?? "").toLowerCase()}`;
    byKey.set(key, price);
  }
  return [...byKey.values()].sort((a, b) => (a.itemId ?? 0) - (b.itemId ?? 0) || String(a.itemName ?? "").localeCompare(String(b.itemName ?? "")));
}

