import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const generatedRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const publicAssetsRoot = path.join(root, "public", "assets");
const reportRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");

const items = readJson(path.join(generatedRoot, "items.json"));
const supplementalItems = readJson(path.join(generatedRoot, "supplemental-items.json"), []);
const monsters = readJson(path.join(generatedRoot, "monsters.json"));
const allItems = mergeItems(items, supplementalItems);

const itemAssets = allItems.map((item) => {
  const expectedPath = `/assets/items/${item.id}.gif`;
  const filePath = path.join(publicAssetsRoot, "items", `${item.id}.gif`);
  return {
    id: item.id,
    name: item.name,
    expectedPath,
    exists: existsSync(filePath)
  };
});

const monsterAssets = monsters.map((monster) => {
  const slug = normalizeAssetName(monster.name);
  const expectedPath = `/assets/monsters/${slug}.gif`;
  const filePath = path.join(publicAssetsRoot, "monsters", `${slug}.gif`);
  return {
    name: monster.name,
    normalizedName: slug,
    expectedPath,
    exists: existsSync(filePath)
  };
});

const missingItems = itemAssets.filter((asset) => !asset.exists);
const missingMonsters = monsterAssets.filter((asset) => !asset.exists);
const foundItems = itemAssets.length - missingItems.length;
const foundMonsters = monsterAssets.length - missingMonsters.length;

const report = {
  generatedAt: new Date().toISOString(),
  directories: {
    items: "public/assets/items",
    monsters: "public/assets/monsters",
    npcs: "public/assets/npcs",
    bosses: "public/assets/bosses"
  },
  totals: {
    items: allItems.length,
    sourceItems: items.length,
    supplementalItems: supplementalItems.length,
    itemImagesFound: foundItems,
    itemImagesMissing: missingItems.length,
    monsters: monsters.length,
    monsterImagesFound: foundMonsters,
    monsterImagesMissing: missingMonsters.length
  }
};

const missingAssets = {
  generatedAt: report.generatedAt,
  items: missingItems.map(({ id, name, expectedPath }) => ({ id, name, expectedPath })),
  monsters: missingMonsters.map(({ name, normalizedName, expectedPath }) => ({ name, normalizedName, expectedPath }))
};

mkdirSync(reportRoot, { recursive: true });
writeJson(path.join(reportRoot, "assets-report.json"), report);
writeJson(path.join(reportRoot, "missing-assets.json"), missingAssets);

console.log("Assets verification complete");
console.log(report.totals);

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

function normalizeAssetName(name = "") {
  return String(name)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+/g, "-");
}

function itemLookupKey(name = "") {
  return normalizeAssetName(name).replace(/-/g, " ");
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
