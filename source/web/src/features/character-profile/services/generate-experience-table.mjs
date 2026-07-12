import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "generated");
const outputPath = path.join(outputRoot, "experience-table.json");

mkdirSync(outputRoot, { recursive: true });

const levels = [];
for (let level = 1; level <= 2000; level += 1) {
  levels.push({
    level,
    experience: getExperienceForLevel(level),
    nextLevelExperience: getExperienceForLevel(level + 1)
  });
}

writeFileSync(outputPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: "Tibia experience table formula",
  maxLevel: 2000,
  levels
}, null, 2)}\n`);

console.log("Character experience table generated", {
  outputPath: path.relative(process.cwd(), outputPath),
  levels: levels.length
});

function getExperienceForLevel(level) {
  const safeLevel = Math.max(1, Math.trunc(Number(level) || 1));
  return Math.floor((50 * safeLevel ** 3 - 150 * safeLevel ** 2 + 400 * safeLevel) / 3);
}
