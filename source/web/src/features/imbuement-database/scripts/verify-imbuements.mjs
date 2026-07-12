import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const featureRoot = path.join(root, "source", "web", "src", "features", "imbuement-database");
const databaseRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const outputRoot = path.join(featureRoot, "generated");
const imbuements = readJson(path.join(featureRoot, "data", "imbuements.json"));
const items = mergeItems(
  readJson(path.join(databaseRoot, "items.json")),
  readJson(path.join(databaseRoot, "supplemental-items.json"), [])
);

const materialAliases = {
  [itemLookupKey("mooh'tar shell")]: "mooh'tah shell"
};

const itemByName = new Map();
for (const item of items) {
  const key = itemLookupKey(item.name);
  if (!itemByName.has(key)) itemByName.set(key, item);
}

const rows = [];
for (const imbuement of imbuements) {
  for (const material of imbuement.materials) {
    const resolvedName = materialAliases[itemLookupKey(material.itemName)] ?? material.itemName;
    const item = itemByName.get(itemLookupKey(resolvedName));
    rows.push({
      imbuementId: imbuement.id,
      imbuementName: imbuement.name,
      materialName: material.itemName,
      resolvedName,
      count: material.count,
      matched: Boolean(item),
      ...(item ? { itemId: item.id, localName: item.name } : {})
    });
  }
}

const unmatched = rows.filter((row) => !row.matched);
const report = {
  generatedAt: new Date().toISOString(),
  source: "data/imbuements.json",
  powerfulImbuements: imbuements.length,
  powerfulMaterialRows: rows.length,
  matchedMaterialRows: rows.length - unmatched.length,
  unmatchedMaterialRows: unmatched.length,
  unmatched
};

mkdirSync(outputRoot, { recursive: true });
writeJson(path.join(outputRoot, "imbuements-report.json"), report);
writeJson(path.join(outputRoot, "unmatched-imbuement-materials.json"), unmatched);

console.log("Imbuements verification complete");
console.log({
  powerfulImbuements: report.powerfulImbuements,
  powerfulMaterialRows: report.powerfulMaterialRows,
  matchedMaterialRows: report.matchedMaterialRows,
  unmatchedMaterialRows: report.unmatchedMaterialRows
});

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(readFileSync(filePath, "utf8"));
  } catch {
    if (fallback !== null) return fallback;
    throw new Error(`Unable to read JSON file: ${filePath}`);
  }
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function mergeItems(primaryItems, extraItems) {
  const byId = new Set(primaryItems.flatMap((item) => [item.id, item.clientId].filter(Boolean)));
  const byName = new Set(primaryItems.map((item) => itemLookupKey(item.name)));
  const merged = [...primaryItems];

  for (const item of extraItems) {
    if (byId.has(item.id) || (item.clientId && byId.has(item.clientId)) || byName.has(itemLookupKey(item.name))) continue;
    merged.push(item);
    byId.add(item.id);
    if (item.clientId) byId.add(item.clientId);
    byName.add(itemLookupKey(item.name));
  }

  return merged;
}

function itemLookupKey(name = "") {
  return String(name)
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
