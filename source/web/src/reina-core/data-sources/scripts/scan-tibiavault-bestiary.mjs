import fs from "node:fs/promises";
import https from "node:https";
import path from "node:path";

const rootDir = process.cwd();
const sourceUrl = "https://tibiavault.com/bestiary/";
const generatedDir = path.join(rootDir, "source", "web", "src", "reina-core", "data-sources", "generated");
const monstersPath = path.join(rootDir, "source", "web", "src", "reina-core", "database", "generated", "monsters.json");

await fs.mkdir(generatedDir, { recursive: true });

const generatedAt = new Date().toISOString();
const fetchResult = await fetchTextWithTlsFallback(sourceUrl);
const sourceCreatures = extractBestiaryCreatures(fetchResult.text);
const localMonsters = JSON.parse(await fs.readFile(monstersPath, "utf8"));
const localByKey = new Map(localMonsters.map((monster) => [lookupKey(monster.name), monster]));
const sourceByKey = new Map(sourceCreatures.map((creature) => [creature.lookupKey, creature]));

const matched = [];
const sourceOnly = [];

for (const creature of sourceCreatures) {
  const local = localByKey.get(creature.lookupKey);
  if (local) {
    matched.push({
      name: creature.name,
      sourceUrl: creature.url,
      localName: local.name,
      experience: local.experience,
      health: local.health
    });
  } else {
    sourceOnly.push(creature);
  }
}

const localOnly = localMonsters
  .filter((monster) => !sourceByKey.has(lookupKey(monster.name)))
  .map((monster) => ({
    name: monster.name,
    experience: monster.experience,
    health: monster.health
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

const indexReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  safety: "Controlled index scan only. Nothing is imported into ReinaDataService.",
  fetch: {
    statusCode: fetchResult.statusCode,
    tlsMode: fetchResult.tlsMode,
    contentLength: fetchResult.text.length
  },
  totalCreatures: sourceCreatures.length,
  creatures: sourceCreatures
};

const coverageReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  safety: "Coverage report only. No app data is modified.",
  totals: {
    sourceCreatures: sourceCreatures.length,
    localMonsters: localMonsters.length,
    matched: matched.length,
    sourceOnly: sourceOnly.length,
    localOnly: localOnly.length,
    coveragePct: sourceCreatures.length ? Number(((matched.length / sourceCreatures.length) * 100).toFixed(2)) : 0
  },
  matched: matched.sort((a, b) => a.name.localeCompare(b.name))
};

const unmatchedReport = {
  generatedAt,
  source: "tibiavault",
  sourceUrl,
  safety: "Review list only. Use this to decide future import/mapping work.",
  totals: {
    sourceOnly: sourceOnly.length,
    localOnly: localOnly.length
  },
  sourceOnly: sourceOnly.sort((a, b) => a.name.localeCompare(b.name)),
  localOnly
};

await writeJson("tibiavault-bestiary-index.json", indexReport);
await writeJson("tibiavault-bestiary-coverage.json", coverageReport);
await writeJson("tibiavault-unmatched-monsters.json", unmatchedReport);

console.log("TibiaVault bestiary scan complete");
console.log(coverageReport.totals);

function extractBestiaryCreatures(html) {
  const creatures = new Map();
  const anchorRegex = /<a\s+[^>]*href=["']([^"']*#bestiary\/[^"']+)["'][^>]*>(.*?)<\/a>/gis;

  for (const match of html.matchAll(anchorRegex)) {
    const href = decodeHtml(match[1]);
    const text = stripTags(decodeHtml(match[2])).trim();
    if (!text || text.toLowerCase().includes("open tibiavault")) continue;
    const url = href.startsWith("http") ? href : new URL(href, sourceUrl).toString();
    const key = lookupKey(text);
    if (!key || creatures.has(key)) continue;
    creatures.set(key, {
      name: text,
      lookupKey: key,
      url
    });
  }

  return Array.from(creatures.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function lookupKey(value = "") {
  return decodeHtml(String(value))
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

function stripTags(value) {
  return value.replace(/<[^>]*>/g, "");
}

function decodeHtml(value = "") {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

async function fetchTextWithTlsFallback(url) {
  try {
    return await fetchText(url, true);
  } catch (error) {
    const fallback = await fetchText(url, false);
    return {
      ...fallback,
      tlsMode: "certificate-verification-disabled",
      tlsWarning: error instanceof Error ? error.message : "TLS verification failed"
    };
  }
}

function fetchText(url, rejectUnauthorized) {
  return new Promise((resolve, reject) => {
    const request = https.get(
      url,
      {
        rejectUnauthorized,
        headers: {
          "User-Agent": "ReinaHub datasource scanner (controlled report only)",
          Accept: "text/html"
        }
      },
      (response) => {
        const chunks = [];
        response.on("data", (chunk) => chunks.push(chunk));
        response.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          if ((response.statusCode ?? 0) >= 400) {
            reject(new Error(`HTTP ${response.statusCode}`));
            return;
          }
          resolve({
            text,
            statusCode: response.statusCode,
            tlsMode: rejectUnauthorized ? "verified" : "certificate-verification-disabled"
          });
        });
      }
    );
    request.on("error", reject);
    request.setTimeout(30000, () => {
      request.destroy(new Error("Request timed out"));
    });
  });
}

async function writeJson(fileName, payload) {
  await fs.writeFile(path.join(generatedDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
