import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(root, "source", "assets");
const publicRoot = path.join(root, "public", "images");
const manifestPath = path.join(sourceRoot, "metadata", "asset-manifest.ts");

const categories = ["monsters", "items", "npcs", "bosses", "outfits", "mounts", "spells", "icons"];
const extensions = new Set([".gif", ".png", ".webp", ".jpg", ".jpeg", ".svg"]);

function normalizeAssetName(name) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['`´’]/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    const stats = statSync(full);
    return stats.isDirectory() ? walk(full) : [full];
  });
}

const manifest = Object.fromEntries(categories.map((category) => [category, {}]));

for (const category of categories) {
  const sourceDir = path.join(sourceRoot, category);
  const targetDir = path.join(publicRoot, category);
  mkdirSync(sourceDir, { recursive: true });
  mkdirSync(targetDir, { recursive: true });

  for (const file of walk(sourceDir)) {
    const ext = path.extname(file).toLowerCase();
    if (!extensions.has(ext)) continue;
    const slug = normalizeAssetName(path.basename(file, ext));
    if (!slug) continue;
    const targetName = `${slug}${ext}`;
    const target = path.join(targetDir, targetName);
    copyFileSync(file, target);
    manifest[category][slug] = `/images/${category}/${targetName}`;
  }
}

const content = `export type AssetCategory =
  | "monsters"
  | "items"
  | "npcs"
  | "bosses"
  | "outfits"
  | "mounts"
  | "spells"
  | "icons";

export type AssetManifest = Record<AssetCategory, Record<string, string>>;

export const assetManifest: AssetManifest = ${JSON.stringify(manifest, null, 2)};
`;

writeFileSync(manifestPath, content);
console.log(`Synced game assets and wrote ${path.relative(root, manifestPath)}`);

