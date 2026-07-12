import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { itemLookupKey } from "./item-normalizer.mjs";

const databaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(databaseRoot, "generated");
const reviewPath = path.join(generatedRoot, "unresolved-npc-trades-review.json");
const itemsPath = path.join(generatedRoot, "items.json");
const supplementalItemsPath = path.join(generatedRoot, "supplemental-items.json");

const review = readJson(reviewPath, { items: [] });
const existingItems = readJson(itemsPath, []);
const currentSupplementalItems = readJson(supplementalItemsPath, []);
const result = generateSupplementalItems(review.items ?? [], existingItems, currentSupplementalItems);

mkdirSync(generatedRoot, { recursive: true });
writeJson("supplemental-items.json", result.supplementalItems);
writeJson("supplemental-items-pending-review.json", result.pendingReview);
writeJson("supplemental-items-report.json", {
  generatedAt: new Date().toISOString(),
  source: "unresolved-npc-trades-review.json",
  totalReviewItems: review.items?.length ?? 0,
  supplementalItems: result.supplementalItems.length,
  pendingReview: result.pendingReview.length,
  skippedExisting: result.skippedExisting.length,
  skippedExistingItems: result.skippedExisting
});

console.log("Supplemental items generated");
console.log({
  supplementalItems: result.supplementalItems.length,
  pendingReview: result.pendingReview.length,
  skippedExisting: result.skippedExisting.length
});

function generateSupplementalItems(reviewItems, existingItems, currentSupplementalItems) {
  const existingIds = new Set();
  const existingNames = new Set();

  for (const item of [...existingItems, ...currentSupplementalItems]) {
    existingIds.add(Number(item.id));
    if (item.clientId) existingIds.add(Number(item.clientId));
    existingNames.add(itemLookupKey(item.name));
  }

  const supplementalItems = [...currentSupplementalItems];
  const pendingReview = [];
  const skippedExisting = [];
  const seenSupplementalIds = new Set(currentSupplementalItems.map((item) => Number(item.id)));

  for (const item of reviewItems) {
    const normalizedName = itemLookupKey(item.itemName);
    const clientId = Number(item.clientId);
    const existingById = Number.isFinite(clientId) && existingIds.has(clientId);
    const existingByName = existingNames.has(normalizedName);

    if (existingById || existingByName) {
      if (!currentSupplementalItems.some((existing) => existing.id === clientId || itemLookupKey(existing.name) === normalizedName)) {
        skippedExisting.push({
          itemName: item.itemName,
          ...(item.clientId ? { clientId: item.clientId } : {}),
          reason: existingById ? "id-already-exists" : "name-already-exists"
        });
      }
      continue;
    }

    if (currentSupplementalItems.some((existing) => existing.id === clientId || itemLookupKey(existing.name) === normalizedName)) {
      skippedExisting.push({
        itemName: item.itemName,
        ...(item.clientId ? { clientId: item.clientId } : {}),
        reason: "already-in-supplemental-items"
      });
      continue;
    }

    if (!Number.isFinite(clientId) || clientId <= 0) {
      pendingReview.push({
        itemName: item.itemName,
        occurrences: item.occurrences,
        npcNames: item.npcNames,
        tradeTypes: item.tradeTypes,
        prices: item.prices,
        suggestedAction: "manual-review-required",
        similarItemNames: item.similarItemNames ?? []
      });
      continue;
    }

    if (seenSupplementalIds.has(clientId)) continue;
    seenSupplementalIds.add(clientId);

    const sellPrice = getNpcSellPrice(item);
    supplementalItems.push({
      id: clientId,
      clientId,
      name: item.itemName,
      ...(sellPrice !== null ? { sellPrice } : {}),
      dataSource: "supplemental",
      provenance: {
        source: "npc-trades",
        sourceType: "lua-shop-reference",
        confidence: "medium",
        note: "Created from NPC shop trade with clientId because the item was missing from items.xml."
      }
    });
  }

  return {
    supplementalItems: supplementalItems.sort((a, b) => a.id - b.id),
    pendingReview: pendingReview.sort((a, b) => a.itemName.localeCompare(b.itemName)),
    skippedExisting
  };
}

function getNpcSellPrice(item) {
  const buyPrices = (item.prices ?? []).filter((price) => Number.isFinite(Number(price))).map(Number);
  if (!buyPrices.length || !(item.tradeTypes ?? []).includes("npcBuys")) return null;
  return Math.max(...buyPrices);
}

function readJson(filePath, fallback) {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(file, data) {
  writeFileSync(path.join(generatedRoot, file), `${JSON.stringify(data, null, 2)}\n`);
}
