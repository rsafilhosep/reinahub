import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const inboxRoots = [
  path.join(root, "files_repository", "assets_inbox"),
  path.join(root, "files_repository", "Imgs Assets")
];
const itemsRoot = path.join(root, "public", "assets", "items");
const monstersRoot = path.join(root, "public", "assets", "monsters");
const outputRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");
const items = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "items.json"));
const monsters = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "monsters.json"));

const itemById = new Map(items.map((item) => [String(item.id), item]));
const itemByName = new Map();
for (const item of items) {
  const key = itemLookupKey(item.name);
  if (!itemByName.has(key)) itemByName.set(key, item);
}

const monsterByName = new Map();
for (const monster of monsters) {
  const key = itemLookupKey(monster.name);
  if (!monsterByName.has(key)) monsterByName.set(key, monster);
}

mkdirSync(inboxRoots[0], { recursive: true });
mkdirSync(itemsRoot, { recursive: true });
mkdirSync(monstersRoot, { recursive: true });
mkdirSync(outputRoot, { recursive: true });

const imageFiles = inboxRoots.flatMap((inboxRoot) => walkFiles(inboxRoot)).filter((file) => [".gif", ".png"].includes(path.extname(file).toLowerCase()));
const imported = [];
const unmatched = [];

for (const filePath of imageFiles) {
  const match = matchInboxFile(filePath);
  if (!match) {
    unmatched.push(toUnmatched(filePath, "No item or monster match found"));
    continue;
  }

  const targetPath =
    match.type === "item"
      ? path.join(itemsRoot, `${match.item.id}.gif`)
      : path.join(monstersRoot, `${normalizeAssetName(match.monster.name)}.gif`);
  copyFileSync(filePath, targetPath);
  imported.push(toImported(filePath, match));
}

writeJson(path.join(outputRoot, "imported-assets.json"), {
  generatedAt: new Date().toISOString(),
  importedCount: imported.length,
  imported
});
writeJson(path.join(outputRoot, "unmatched-inbox-assets.json"), {
  generatedAt: new Date().toISOString(),
  unmatchedCount: unmatched.length,
  unmatched
});

console.log("Inbox asset import complete");
console.log({
  inboxes: inboxRoots.map((inboxRoot) => path.relative(root, inboxRoot)),
  imported: imported.length,
  unmatched: unmatched.length
});

function matchInboxFile(filePath) {
  const basename = path.basename(filePath, path.extname(filePath));
  const numeric = basename.match(/^\d+$/)?.[0];
  if (numeric && itemById.has(numeric)) return { type: "item", item: itemById.get(numeric), matchedBy: "itemId" };

  const normalized = itemLookupKey(basename);
  if (monsterByName.has(normalized)) return { type: "monster", monster: monsterByName.get(normalized), matchedBy: "normalizedMonsterName" };
  if (itemByName.has(normalized)) return { type: "item", item: itemByName.get(normalized), matchedBy: "normalizedItemName" };

  const compact = normalized.replace(/\s+/g, "");
  for (const [nameKey, monster] of monsterByName.entries()) {
    if (nameKey.replace(/\s+/g, "") === compact) return { type: "monster", monster, matchedBy: "compactNormalizedMonsterName" };
  }

  for (const [nameKey, item] of itemByName.entries()) {
    if (nameKey.replace(/\s+/g, "") === compact) return { type: "item", item, matchedBy: "compactNormalizedItemName" };
  }

  return null;
}

function toImported(filePath, match) {
  const base = {
    sourcePath: path.relative(root, filePath),
    entityType: match.type,
    matchedBy: match.matchedBy,
    sourceExtension: path.extname(filePath).toLowerCase()
  };

  if (match.type === "item") {
    return {
      ...base,
      itemId: match.item.id,
      name: match.item.name,
      targetPath: `/assets/items/${match.item.id}.gif`
    };
  }

  return {
    ...base,
    name: match.monster.name,
    normalizedName: normalizeAssetName(match.monster.name),
    targetPath: `/assets/monsters/${normalizeAssetName(match.monster.name)}.gif`
  };
}

function walkFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);
    return stats.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

function toUnmatched(filePath, reason) {
  return {
    sourcePath: path.relative(root, filePath),
    fileName: path.basename(filePath),
    normalizedName: itemLookupKey(path.basename(filePath, path.extname(filePath))),
    reason
  };
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function itemLookupKey(name = "") {
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
    .trim();
}

function normalizeAssetName(name = "") {
  return itemLookupKey(name).replace(/\s+/g, "-");
}
