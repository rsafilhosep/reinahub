import fs from "node:fs/promises";
import path from "node:path";

const rootDir = process.cwd();
const repositoryDir = path.join(rootDir, "files_repository");
const allowlistPath = path.join(rootDir, "source", "web", "src", "reina-core", "repository", "lua-risk-allowlist.json");
const generatedDir = path.join(rootDir, "source", "web", "src", "reina-core", "repository", "generated");

const riskRules = {
  high: ["os.execute", "io.popen", "loadstring", "socket", "http", "webhook"],
  medium: ["require", "dofile", "io.open"],
  low: ["token", "password", "secret", "key"]
};

const knownLowRiskPhrases = ["gold token", "silver token", "secret service", "secret agent", "key ring"];

const riskTerms = Object.values(riskRules).flat();

const detectors = {
  npc: [
    /NpcHandler/i,
    /KeywordHandler/i,
    /npcHandler/i,
    /onCreatureSay/i,
    /onThink/i,
    /creatureSayCallback/i,
    /greetCallback/i,
    /farewellCallback/i
  ],
  shop: [
    /ShopModule/i,
    /addBuyableItem/i,
    /addSellableItem/i,
    /addShopItem/i,
    /shopModule/i,
    /\bbuy\b.*\bprice\b/i,
    /\bsell\b.*\bprice\b/i,
    /\bprice\s*=/i
  ],
  monster: [
    /MonsterType/i,
    /createMonsterType/i,
    /\bmType\b/i,
    /\bmonster\s*=/i,
    /\bexperience\s*=/i,
    /\bhealth\s*=/i,
    /\bcorpse\s*=/i
  ],
  loot: [
    /\bloot\s*=/i,
    /\bchance\s*=/i,
    /\bmaxCount\s*=/i,
    /\bmaxcount\s*=/i,
    /\bitemId\s*=/i,
    /\bitemid\s*=/i
  ],
  itemIds: [
    /\bitemId\s*=\s*\d+/gi,
    /\bitemid\s*=\s*\d+/gi,
    /\bid\s*=\s*\d+/gi,
    /addItem\s*\(\s*\d+/gi,
    /doPlayerAddItem\s*\([^,\n]+,\s*\d+/gi,
    /doCreateItem\s*\(\s*\d+/gi
  ],
  prices: [
    /\bprice\s*=\s*\d+/gi,
    /\bbuy\s*=\s*\d+/gi,
    /\bsell\s*=\s*\d+/gi,
    /\bcost\s*=\s*\d+/gi,
    /\bgold\s*=\s*\d+/gi
  ]
};

await fs.mkdir(generatedDir, { recursive: true });

const allowlist = await loadRiskAllowlist();
const luaFiles = await findLuaFiles(repositoryDir);
const scannedAt = new Date().toISOString();
const fileReports = [];
const npcCandidates = [];
const monsterCandidates = [];
const shopCandidates = [];
const riskReports = [];
const highRiskOccurrences = [];

for (const absolutePath of luaFiles) {
  const relativePath = path.relative(rootDir, absolutePath);
  const content = await fs.readFile(absolutePath, "utf8");
  const stats = await fs.stat(absolutePath);
  const lines = content.split(/\r?\n/);
  const categories = detectCategories(content);
  const itemIdMatches = collectRegexMatches(content, detectors.itemIds, 20);
  const priceMatches = collectRegexMatches(content, detectors.prices, 20);
  const riskMatches = collectRiskMatches(lines);
  highRiskOccurrences.push(
    ...riskMatches
      .filter((match) => match.severity === "high")
      .map((match) => ({
        filePath: relativePath,
        term: match.term,
        lineNumber: match.line,
        linePreview: match.snippet,
        suggestedClassification: "review-required"
      }))
  );

  const baseReport = {
    path: relativePath,
    bytes: stats.size,
    lines: lines.length,
    categories,
    itemIdMatches: itemIdMatches.length,
    priceMatches: priceMatches.length,
    riskMatches: riskMatches.length
  };

  fileReports.push(baseReport);

  if (categories.includes("npc")) {
    npcCandidates.push({
      path: relativePath,
      bytes: stats.size,
      signals: collectSignals(content, detectors.npc),
      shopSignals: collectSignals(content, detectors.shop),
      sampleItemIds: itemIdMatches.slice(0, 10),
      samplePrices: priceMatches.slice(0, 10)
    });
  }

  if (categories.includes("monster") || categories.includes("loot")) {
    monsterCandidates.push({
      path: relativePath,
      bytes: stats.size,
      signals: collectSignals(content, [...detectors.monster, ...detectors.loot]),
      sampleItemIds: itemIdMatches.slice(0, 10),
      samplePrices: priceMatches.slice(0, 10)
    });
  }

  if (categories.includes("shop")) {
    shopCandidates.push({
      path: relativePath,
      bytes: stats.size,
      signals: collectSignals(content, detectors.shop),
      sampleItemIds: itemIdMatches.slice(0, 15),
      samplePrices: priceMatches.slice(0, 15)
    });
  }

  if (riskMatches.length) {
    const severities = Array.from(new Set(riskMatches.map((match) => match.severity)));
    riskReports.push({
      path: relativePath,
      bytes: stats.size,
      highestSeverity: getHighestSeverity(severities),
      severities,
      riskTerms: Array.from(new Set(riskMatches.map((match) => match.term))),
      matches: riskMatches.slice(0, 30)
    });
  }
}

const riskBySeverity = groupRiskReportsBySeverity(riskReports);
const highRiskReview = buildHighRiskReview(highRiskOccurrences, scannedAt);
const highRiskActive = buildHighRiskActive(highRiskOccurrences, allowlist, scannedAt);

const totals = {
  luaFiles: fileReports.length,
  npcCandidates: npcCandidates.length,
  monsterCandidates: monsterCandidates.length,
  shopCandidates: shopCandidates.length,
  riskyFiles: riskReports.length,
  totalHigh: riskBySeverity.high.length,
  totalMedium: riskBySeverity.medium.length,
  totalLow: riskBySeverity.low.length
};

await writeJson("lua-files-report.json", {
  generatedAt: scannedAt,
  repository: "files_repository",
  safety: "Text scan only. No Lua files are executed.",
  totals,
  files: fileReports.sort((a, b) => a.path.localeCompare(b.path))
});

await writeJson("lua-npc-candidates.json", {
  generatedAt: scannedAt,
  repository: "files_repository",
  safety: "Candidates only. Nothing is imported into ReinaHub automatically.",
  total: npcCandidates.length,
  candidates: npcCandidates.sort((a, b) => a.path.localeCompare(b.path))
});

await writeJson("lua-monster-candidates.json", {
  generatedAt: scannedAt,
  repository: "files_repository",
  safety: "Candidates only. Nothing is imported into ReinaHub automatically.",
  total: monsterCandidates.length,
  candidates: monsterCandidates.sort((a, b) => a.path.localeCompare(b.path))
});

await writeJson("lua-shop-candidates.json", {
  generatedAt: scannedAt,
  repository: "files_repository",
  safety: "Candidates only. Nothing is imported into ReinaHub automatically.",
  total: shopCandidates.length,
  candidates: shopCandidates.sort((a, b) => a.path.localeCompare(b.path))
});

await writeJson("lua-risk-report.json", {
  generatedAt: scannedAt,
  repository: "files_repository",
  safety: "Risk terms indicate files that deserve manual review. The scanner does not execute them.",
  searchedTerms: riskRules,
  ignoredKnownLowRiskPhrases: knownLowRiskPhrases,
  total: riskReports.length,
  totalHigh: riskBySeverity.high.length,
  totalMedium: riskBySeverity.medium.length,
  totalLow: riskBySeverity.low.length,
  bySeverity: riskBySeverity,
  files: riskReports.sort((a, b) => a.path.localeCompare(b.path))
});

await writeJson("lua-high-risk-review.json", highRiskReview);
await writeJson("lua-high-risk-active.json", highRiskActive);

console.log("Lua repository scan complete");
console.log(totals);

async function findLuaFiles(startDir) {
  try {
    const entries = await fs.readdir(startDir, { withFileTypes: true });
    const nested = await Promise.all(
      entries.map(async (entry) => {
        const absolutePath = path.join(startDir, entry.name);
        if (entry.isDirectory()) return findLuaFiles(absolutePath);
        if (entry.isFile() && entry.name.toLowerCase().endsWith(".lua")) return [absolutePath];
        return [];
      })
    );
    return nested.flat();
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function loadRiskAllowlist() {
  try {
    const raw = await fs.readFile(allowlistPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.entries) ? parsed.entries : [];
  } catch (error) {
    if (error && error.code === "ENOENT") return [];
    throw error;
  }
}

function detectCategories(content) {
  const categories = [];
  if (detectors.npc.some((pattern) => pattern.test(content))) categories.push("npc");
  if (detectors.shop.some((pattern) => pattern.test(content))) categories.push("shop");
  if (detectors.monster.some((pattern) => pattern.test(content))) categories.push("monster");
  if (detectors.loot.some((pattern) => pattern.test(content))) categories.push("loot");
  if (collectRegexMatches(content, detectors.itemIds, 1).length) categories.push("item-ids");
  if (collectRegexMatches(content, detectors.prices, 1).length) categories.push("prices");
  return categories;
}

function collectSignals(content, patterns) {
  return patterns
    .map((pattern) => {
      const match = content.match(pattern);
      return match ? String(match[0]) : null;
    })
    .filter(Boolean)
    .slice(0, 12);
}

function collectRegexMatches(content, patterns, limit) {
  const matches = [];
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
    for (const match of content.matchAll(regex)) {
      matches.push(match[0].replace(/\s+/g, " ").trim());
      if (matches.length >= limit) return matches;
    }
  }
  return matches;
}

function collectRiskMatches(lines) {
  const matches = [];
  lines.forEach((line, index) => {
    const lower = line.toLowerCase();
    for (const [severity, terms] of Object.entries(riskRules)) {
      for (const term of terms) {
        if (!lower.includes(term.toLowerCase())) continue;
        if (severity === "low" && isKnownLowRiskPhrase(lower, term)) continue;
        matches.push({
          severity,
          term,
          line: index + 1,
          snippet: line.trim().slice(0, 180)
        });
      }
    }
  });
  return matches;
}

function isKnownLowRiskPhrase(line, term) {
  if (!["token", "secret", "key"].includes(term)) return false;
  return knownLowRiskPhrases.some((phrase) => line.includes(phrase));
}

function groupRiskReportsBySeverity(reports) {
  return {
    high: reports
      .filter((report) => report.severities.includes("high"))
      .map((report) => compactRiskReport(report, "high"))
      .sort((a, b) => a.path.localeCompare(b.path)),
    medium: reports
      .filter((report) => report.severities.includes("medium") && !report.severities.includes("high"))
      .map((report) => compactRiskReport(report, "medium"))
      .sort((a, b) => a.path.localeCompare(b.path)),
    low: reports
      .filter((report) => report.severities.length === 1 && report.severities.includes("low"))
      .map((report) => compactRiskReport(report, "low"))
      .sort((a, b) => a.path.localeCompare(b.path))
  };
}

function compactRiskReport(report, severity) {
  const matches = report.matches
    .filter((match) => match.severity === severity)
    .map((match) => ({
      term: match.term,
      line: match.line,
      snippet: match.snippet
    }));

  return {
    path: report.path,
    terms: Array.from(new Set(matches.map((match) => match.term))),
    matches
  };
}

function getHighestSeverity(severities) {
  if (severities.includes("high")) return "high";
  if (severities.includes("medium")) return "medium";
  return "low";
}

function buildHighRiskReview(occurrences, generatedAt) {
  const sortedOccurrences = [...occurrences].sort(
    (a, b) => a.filePath.localeCompare(b.filePath) || a.lineNumber - b.lineNumber || a.term.localeCompare(b.term)
  );

  return {
    generatedAt,
    repository: "files_repository",
    safety: "High risk review is generated from text scanning only. No Lua files are executed.",
    summary: {
      totalHighOccurrences: sortedOccurrences.length,
      totalHighFiles: new Set(sortedOccurrences.map((occurrence) => occurrence.filePath)).size,
      termsCount: countTerms(sortedOccurrences)
    },
    occurrences: sortedOccurrences
  };
}

function buildHighRiskActive(occurrences, allowlistEntries, generatedAt) {
  const allowlistKeys = new Set(allowlistEntries.map((entry) => occurrenceKey(entry)));
  const activeOccurrences = occurrences
    .filter((occurrence) => !allowlistKeys.has(occurrenceKey(occurrence)))
    .sort((a, b) => a.filePath.localeCompare(b.filePath) || a.lineNumber - b.lineNumber || a.term.localeCompare(b.term));

  return {
    generatedAt,
    repository: "files_repository",
    safety: "Active high risk items exclude manually allowlisted false positives. No Lua files are executed.",
    allowlistFile: path.relative(rootDir, allowlistPath),
    summary: {
      totalHighOccurrences: occurrences.length,
      totalAllowlistedOccurrences: occurrences.length - activeOccurrences.length,
      totalActiveHighOccurrences: activeOccurrences.length,
      totalActiveHighFiles: new Set(activeOccurrences.map((occurrence) => occurrence.filePath)).size,
      termsCount: countTerms(activeOccurrences)
    },
    occurrences: activeOccurrences
  };
}

function occurrenceKey(occurrence) {
  return `${occurrence.filePath}|${occurrence.term}|${occurrence.lineNumber}`;
}

function countTerms(occurrences) {
  return occurrences.reduce((counts, occurrence) => {
    counts[occurrence.term] = (counts[occurrence.term] ?? 0) + 1;
    return counts;
  }, {});
}

async function writeJson(fileName, payload) {
  await fs.writeFile(path.join(generatedDir, fileName), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}
