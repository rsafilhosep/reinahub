import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const inboxRoots = [
  path.join(root, "files_repository", "assets_inbox"),
  path.join(root, "files_repository", "Imgs Assets"),
  path.join(root, "files_repository", "Imgs Testes")
];
const itemsRoot = path.join(root, "public", "assets", "items");
const monstersRoot = path.join(root, "public", "assets", "monsters");
const npcsRoot = path.join(root, "public", "assets", "npcs");
const bossesRoot = path.join(root, "public", "assets", "bosses");
const outputRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");
const aliasesPath = path.join(root, "source", "web", "src", "reina-core", "assets", "asset-aliases.json");
const items = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "items.json"));
const supplementalItems = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "supplemental-items.json"), []);
const monsters = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "monsters.json"));
const npcs = readJson(path.join(root, "source", "web", "src", "reina-core", "database", "generated", "npcs.json"), []);
const aliases = normalizeAliases(readJson(aliasesPath, {}));
const allItems = mergeItems(items, supplementalItems);

const itemById = new Map(allItems.map((item) => [String(item.id), item]));
const itemByName = new Map();
for (const item of allItems) {
  const key = itemLookupKey(item.name);
  if (!itemByName.has(key)) itemByName.set(key, item);
}

const monsterByName = new Map();
for (const monster of monsters) {
  const key = itemLookupKey(monster.name);
  if (!monsterByName.has(key)) monsterByName.set(key, monster);
}

const npcByName = new Map();
for (const npc of npcs) {
  const key = itemLookupKey(npc.name);
  if (!npcByName.has(key)) npcByName.set(key, npc);
}

mkdirSync(inboxRoots[0], { recursive: true });
mkdirSync(itemsRoot, { recursive: true });
mkdirSync(monstersRoot, { recursive: true });
mkdirSync(npcsRoot, { recursive: true });
mkdirSync(bossesRoot, { recursive: true });
mkdirSync(outputRoot, { recursive: true });

const imageFiles = inboxRoots.flatMap((inboxRoot) => walkFiles(inboxRoot)).filter((file) => [".gif", ".png"].includes(path.extname(file).toLowerCase()));
const imported = [];
const unmatched = [];

for (const filePath of imageFiles) {
  const match = matchInboxFile(filePath);
  if (!match) {
    unmatched.push(toUnmatched(filePath, "No item, monster or NPC match found"));
    continue;
  }

  const targetPath = getTargetPath(match);
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
writeJson(path.join(outputRoot, "unmatched-assets-review.json"), buildUnmatchedReview(unmatched));

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
  const aliasMatch = matchAlias(normalized);
  if (aliasMatch) return aliasMatch;

  if (monsterByName.has(normalized)) return { type: "monster", monster: monsterByName.get(normalized), matchedBy: "normalizedMonsterName" };
  if (itemByName.has(normalized)) return { type: "item", item: itemByName.get(normalized), matchedBy: "normalizedItemName" };
  if (npcByName.has(normalized)) return { type: "npc", npc: npcByName.get(normalized), matchedBy: "normalizedNpcName" };

  const compact = normalized.replace(/\s+/g, "");
  for (const [nameKey, monster] of monsterByName.entries()) {
    if (nameKey.replace(/\s+/g, "") === compact) return { type: "monster", monster, matchedBy: "compactNormalizedMonsterName" };
  }

  for (const [nameKey, item] of itemByName.entries()) {
    if (nameKey.replace(/\s+/g, "") === compact) return { type: "item", item, matchedBy: "compactNormalizedItemName" };
  }

  for (const [nameKey, npc] of npcByName.entries()) {
    if (nameKey.replace(/\s+/g, "") === compact) return { type: "npc", npc, matchedBy: "compactNormalizedNpcName" };
  }

  return null;
}

function matchAlias(normalizedName) {
  const itemTarget = aliases.items[normalizedName];
  const monsterTarget = aliases.monsters[normalizedName];
  const npcTarget = aliases.npcs[normalizedName];
  const bossTarget = aliases.bosses[normalizedName];

  const item = resolveItemAlias(itemTarget);
  if (item) return { type: "item", item, matchedBy: "assetAliasItem" };

  const monster = resolveNameAlias(monsterTarget, monsterByName);
  if (monster) return { type: "monster", monster, matchedBy: "assetAliasMonster" };
  if (monsterTarget) return { type: "monster", monster: { name: String(monsterTarget) }, matchedBy: "assetAliasMonsterRaw" };

  const npc = resolveNameAlias(npcTarget, npcByName);
  if (npc) return { type: "npc", npc, matchedBy: "assetAliasNpc" };
  if (npcTarget) return { type: "npc", npc: { name: String(npcTarget) }, matchedBy: "assetAliasNpcRaw" };

  if (bossTarget) return { type: "boss", bossName: String(bossTarget), matchedBy: "assetAliasBoss" };

  return null;
}

function resolveItemAlias(target) {
  if (!target) return null;
  if (typeof target === "number" || /^\d+$/.test(String(target))) return itemById.get(String(target)) ?? null;
  return itemByName.get(itemLookupKey(target)) ?? null;
}

function resolveNameAlias(target, index) {
  if (!target) return null;
  return index.get(itemLookupKey(target)) ?? null;
}

function getTargetPath(match) {
  if (match.type === "item") return path.join(itemsRoot, `${match.item.id}.gif`);
  if (match.type === "monster") return path.join(monstersRoot, `${normalizeAssetName(match.monster.name)}.gif`);
  if (match.type === "npc") return path.join(npcsRoot, `${normalizeAssetName(match.npc.name)}.gif`);
  return path.join(bossesRoot, `${normalizeAssetName(match.bossName)}.gif`);
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

  if (match.type === "npc") {
    return {
      ...base,
      name: match.npc.name,
      normalizedName: normalizeAssetName(match.npc.name),
      targetPath: `/assets/npcs/${normalizeAssetName(match.npc.name)}.gif`
    };
  }

  if (match.type === "boss") {
    return {
      ...base,
      name: match.bossName,
      normalizedName: normalizeAssetName(match.bossName),
      targetPath: `/assets/bosses/${normalizeAssetName(match.bossName)}.gif`
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
  const fileName = path.basename(filePath);
  const normalizedName = itemLookupKey(path.basename(filePath, path.extname(filePath)));
  return {
    sourcePath: path.relative(root, filePath),
    fileName,
    normalizedName,
    probableType: inferProbableType(fileName, normalizedName),
    reason
  };
}

function buildUnmatchedReview(unmatchedRows) {
  const rows = unmatchedRows.map((row) => ({
    fileName: row.fileName,
    normalizedName: row.normalizedName,
    probableType: row.probableType,
    suggestedAction: getSuggestedAction(row.probableType),
    sourcePath: row.sourcePath
  }));

  return {
    generatedAt: new Date().toISOString(),
    total: rows.length,
    byProbableType: rows.reduce((acc, row) => {
      acc[row.probableType] = (acc[row.probableType] ?? 0) + 1;
      return acc;
    }, {}),
    rows
  };
}

function inferProbableType(fileName, normalizedName) {
  const lowerFile = fileName.toLowerCase();
  if (normalizedName.startsWith("outfit ")) return "outfit";
  if (normalizedName.startsWith("mount ")) return "mount";
  if (/\bnpc\b/.test(normalizedName)) return "npc";
  if (lowerFile.includes("(creature)") || ["cow", "fish creature", "horse brown", "horse grey", "horse taupe", "rabid wolf"].includes(normalizedName)) return "creature-not-in-database";
  if (/\b(icon|games icon|equation|levitate|stairs)\b/.test(normalizedName)) return "icon-or-ui";
  if (/\bflask|potion|book|trophy|paper|pork\b/.test(normalizedName)) return "item-name-review";
  return "name-review";
}

function getSuggestedAction(probableType) {
  if (probableType === "item-name-review" || probableType === "creature-not-in-database") return "review-for-asset-alias-or-data-enrichment";
  if (probableType === "npc") return "review-for-npc-alias";
  if (probableType === "outfit" || probableType === "mount") return "keep-for-future-outfit-mount-system";
  if (probableType === "icon-or-ui") return "keep-for-future-icon-system";
  return "manual-review";
}

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
    .replace(/['"]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAssetName(name = "") {
  return itemLookupKey(name).replace(/\s+/g, "-");
}

function normalizeAliases(rawAliases = {}) {
  const normalizeGroup = (group = {}) =>
    Object.fromEntries(Object.entries(group).map(([alias, target]) => [itemLookupKey(alias), target]));

  return {
    items: normalizeGroup(rawAliases.items),
    monsters: normalizeGroup(rawAliases.monsters),
    npcs: normalizeGroup(rawAliases.npcs),
    bosses: normalizeGroup(rawAliases.bosses)
  };
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
