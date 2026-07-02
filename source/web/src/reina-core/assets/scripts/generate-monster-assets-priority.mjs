import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const databaseRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const outputRoot = path.join(root, "source", "web", "src", "reina-core", "assets", "generated");
const monstersRoot = path.join(root, "public", "assets", "monsters");

const monsters = readJson(path.join(databaseRoot, "monsters.json"));
const monsterLoot = readJson(path.join(databaseRoot, "monster-loot.json"));

const lootCountByMonster = new Map();
for (const loot of monsterLoot) {
  lootCountByMonster.set(loot.monsterName, (lootCountByMonster.get(loot.monsterName) ?? 0) + 1);
}

const priority = monsters
  .map((monster) => {
    const normalizedName = normalizeAssetName(monster.name);
    const expectedPath = `/assets/monsters/${normalizedName}.gif`;
    const hasImage = existsSync(path.join(monstersRoot, `${normalizedName}.gif`));
    const lootEntryCount = lootCountByMonster.get(monster.name) ?? 0;
    const priorityScore = lootEntryCount * 10 + monster.experience / 100 + monster.health / 1000;

    return {
      name: monster.name,
      normalizedName,
      expectedPath,
      experience: monster.experience,
      health: monster.health,
      lootEntryCount,
      hasImage,
      priorityScore: Number(priorityScore.toFixed(2))
    };
  })
  .sort((a, b) => b.priorityScore - a.priorityScore || a.name.localeCompare(b.name));

mkdirSync(outputRoot, { recursive: true });
writeJson(path.join(outputRoot, "monster-assets-priority-report.json"), {
  generatedAt: new Date().toISOString(),
  totalMonsters: priority.length,
  imagesFound: priority.filter((monster) => monster.hasImage).length,
  imagesMissing: priority.filter((monster) => !monster.hasImage).length,
  ranking: priority
});
writeJson(path.join(outputRoot, "top-50-monster-assets.json"), priority.slice(0, 50));
writeJson(path.join(outputRoot, "top-100-monster-assets.json"), priority.slice(0, 100));

console.log("Monster asset priority complete");
console.log({
  totalMonsters: priority.length,
  imagesFound: priority.filter((monster) => monster.hasImage).length,
  imagesMissing: priority.filter((monster) => !monster.hasImage).length
});

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function normalizeAssetName(name = "") {
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
    .trim()
    .replace(/\s+/g, "-");
}
