import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importItemsXml } from "./items-importer.mjs";
import { importMonstersXml, flattenMonsterLoot } from "./monsters-importer.mjs";
import { importNpcSellPrices } from "./npc-sell-prices-importer.mjs";
import { validateDatabase } from "./validate-database.mjs";
import { itemLookupKey, loadManualMappings } from "./item-normalizer.mjs";

const databaseRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = path.join(databaseRoot, "generated");
const manualMappingsPath = path.join(databaseRoot, "manual-mappings.json");

const args = parseArgs(process.argv.slice(2));
const manualMappingsRaw = readManualMappings();
const manualMappings = loadManualMappings(manualMappingsRaw);

const npcSellPrices = importNpcSellPrices(args.npc);
const items = mergeSellPrices(importItemsXml(args.items), npcSellPrices, manualMappings);
const monsters = importMonstersXml(args.monsters);
const monsterLoot = flattenMonsterLoot(monsters);
const validation = validateDatabase({ items, npcSellPrices, monsterLoot, manualMappings: manualMappingsRaw });

mkdirSync(generatedRoot, { recursive: true });
writeJson("items.json", items);
writeJson("npc-sell-prices.json", npcSellPrices);
writeJson("monsters.json", monsters);
writeJson("monster-loot.json", monsterLoot);
writeJson("unresolved-items.json", compactUnresolvedItems(validation.unresolvedItems));
writeJson("validation-report.json", {
  ...validation,
  sourceWarnings: buildSourceWarnings(args)
});

console.log(`Generated database in ${path.relative(process.cwd(), generatedRoot)}`);
console.log(`items: ${items.length}`);
console.log(`npc sell prices: ${npcSellPrices.length}`);
console.log(`monsters: ${monsters.length}`);
console.log(`monster loot rows: ${monsterLoot.length}`);
console.log(`validation issues: ${validation.duplicateItemIds.length + validation.duplicateItemNames.length + validation.lootWithoutItem.length + validation.npcPricesWithoutItem.length}`);
console.log(`resolved automatically: ${validation.resolutionSummary.resolvedAutomatically}`);
console.log(`resolved by manual mapping: ${validation.resolutionSummary.resolvedByManualMapping}`);
console.log(`unresolved item refs: ${validation.resolutionSummary.unresolved}`);

function writeJson(file, data) {
  writeFileSync(path.join(generatedRoot, file), `${JSON.stringify(data, null, 2)}\n`);
}

function compactUnresolvedItems(unresolvedItems) {
  const byKey = new Map();
  for (const ref of unresolvedItems) {
    const key = `${ref.source}:${ref.itemId ?? ""}:${itemLookupKey(ref.itemName ?? "")}`;
    const existing = byKey.get(key) ?? {
      source: ref.source,
      ...(ref.itemId ? { itemId: ref.itemId } : {}),
      ...(ref.itemName ? { itemName: ref.itemName } : {}),
      occurrences: 0,
      sampleMonsterNames: []
    };

    existing.occurrences += 1;
    if (ref.monsterName && existing.sampleMonsterNames.length < 8 && !existing.sampleMonsterNames.includes(ref.monsterName)) {
      existing.sampleMonsterNames.push(ref.monsterName);
    }
    if (ref.sellPrice) existing.sellPrice = ref.sellPrice;
    byKey.set(key, existing);
  }

  return [...byKey.values()].sort((a, b) => {
    if (a.source !== b.source) return a.source.localeCompare(b.source);
    return (b.occurrences ?? 0) - (a.occurrences ?? 0);
  });
}

function mergeSellPrices(items, prices, manualMappings) {
  const byId = new Map();
  const byClientId = new Map();
  const byName = new Map();
  for (const item of items) {
    if (!byId.has(item.id)) byId.set(item.id, item);
    if (item.clientId && !byClientId.has(item.clientId)) byClientId.set(item.clientId, item);
    const normalized = itemLookupKey(item.name);
    if (!byName.has(normalized)) byName.set(normalized, item);
  }

  for (const price of prices) {
    const item =
      (price.itemId ? byId.get(price.itemId) ?? byClientId.get(price.itemId) : null) ??
      byName.get(itemLookupKey(price.itemName ?? "")) ??
      resolveMappedPrice(price, { byId, byClientId, byName }, manualMappings);
    if (item) item.sellPrice = price.sellPrice;
  }

  return items.sort((a, b) => a.id - b.id);
}

function resolveMappedPrice(price, index, manualMappings) {
  const idAlias = price.itemId ? manualMappings.itemIdAliases[String(price.itemId)] : undefined;
  const nameAlias = price.itemName ? manualMappings.itemNameAliases[itemLookupKey(price.itemName)] : undefined;
  return resolveManualTarget(idAlias ?? nameAlias, index);
}

function resolveManualTarget(target, index) {
  if (!target) return null;
  if (typeof target === "number") return index.byId.get(target) ?? index.byClientId.get(target) ?? null;
  if (typeof target === "string") return index.byName.get(itemLookupKey(target)) ?? null;
  if (typeof target !== "object") return null;
  if (target.itemId) return index.byId.get(target.itemId) ?? null;
  if (target.clientId) return index.byClientId.get(target.clientId) ?? null;
  if (target.itemName) return index.byName.get(itemLookupKey(target.itemName)) ?? null;
  return null;
}

function readManualMappings() {
  if (!existsSync(manualMappingsPath)) return {};
  return JSON.parse(readFileSync(manualMappingsPath, "utf8"));
}

function buildSourceWarnings(parsedArgs) {
  return [
    !parsedArgs.items ? "Missing --items path/to/items.xml" : null,
    !parsedArgs.npc ? "Missing --npc path/to/npc.xml" : null,
    !parsedArgs.monsters ? "Missing --monsters path/to/monsters-folder-or-file" : null
  ].filter(Boolean);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    parsed[arg.slice(2)] = argv[index + 1];
    index += 1;
  }
  return parsed;
}
