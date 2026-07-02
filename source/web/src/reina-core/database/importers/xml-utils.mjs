import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { itemLookupKey } from "./item-normalizer.mjs";

export function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

export function decodeXml(value = "") {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function parseAttributes(tag = "") {
  const attrs = {};
  const attrPattern = /([a-zA-Z_:-][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (const match of tag.matchAll(attrPattern)) {
    attrs[match[1].toLowerCase()] = decodeXml(match[2] ?? match[3] ?? "");
  }
  return attrs;
}

export function toNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeName(name = "") {
  return itemLookupKey(name);
}

export function walkXmlFiles(inputPath) {
  if (!inputPath || !existsSync(inputPath)) return [];
  const stats = statSync(inputPath);
  if (stats.isFile()) return inputPath.toLowerCase().endsWith(".xml") ? [inputPath] : [];

  return readdirSync(inputPath).flatMap((entry) => {
    const full = path.join(inputPath, entry);
    const childStats = statSync(full);
    if (childStats.isDirectory()) return walkXmlFiles(full);
    return full.toLowerCase().endsWith(".xml") ? [full] : [];
  });
}

export function walkFilesByExtension(inputPath, extensions) {
  if (!inputPath || !existsSync(inputPath)) return [];
  const allowed = new Set(extensions.map((ext) => ext.toLowerCase()));
  const stats = statSync(inputPath);
  if (stats.isFile()) return allowed.has(path.extname(inputPath).toLowerCase()) ? [inputPath] : [];

  return readdirSync(inputPath).flatMap((entry) => {
    const full = path.join(inputPath, entry);
    const childStats = statSync(full);
    if (childStats.isDirectory()) return walkFilesByExtension(full, extensions);
    return allowed.has(path.extname(full).toLowerCase()) ? [full] : [];
  });
}

export function extractTags(xml, tagName) {
  const pattern = new RegExp(`<${tagName}\\b[^>]*(?:/>|>[\\s\\S]*?</${tagName}>)`, "gi");
  return [...xml.matchAll(pattern)].map((match) => match[0]);
}

export function stripOuterTag(tagBlock, tagName) {
  return tagBlock
    .replace(new RegExp(`^<${tagName}\\b[^>]*>`, "i"), "")
    .replace(new RegExp(`</${tagName}>$`, "i"), "");
}
