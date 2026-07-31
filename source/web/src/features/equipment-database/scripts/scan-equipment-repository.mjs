import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const rootDir = process.cwd();
const repositoryDir = path.join(rootDir, "files_repository");
const featureDir = path.join(rootDir, "source", "web", "src", "features", "equipment-database");
const generatedDir = path.join(featureDir, "generated");
const equipmentPath = path.join(featureDir, "data", "equipment.json");
const itemsPath = path.join(rootDir, "source", "web", "src", "reina-core", "database", "generated", "items.json");
const readonly = process.env.REINAHUB_VERIFY_READONLY === "1";

const readableExtensions = new Set([".html", ".htm", ".csv", ".tsv", ".json", ".txt", ".pdf"]);
const maxFileBytes = 5 * 1024 * 1024;
const ignoredPathFragments = [
  "proficiencies.json",
  "eventscheduler",
  "package.json",
  "cmakelists.txt",
  ".luarc.json",
  "liquidos",
  "runas",
  "itens de imbuements"
];

const headerAliases = {
  name: ["nome", "name", "item", "equipamento"],
  level: ["level", "lvl", "nivel", "nível"],
  vocations: ["voc", "vocacao", "vocação", "vocation", "vocations"],
  hands: ["maos", "mãos", "hands", "handed"],
  attack: ["atk", "ataque", "attack"],
  defense: ["def", "defesa", "defense"],
  armor: ["arm", "armor", "armadura"],
  element: ["elemento", "element", "dano elemental", "elemental"],
  range: ["range", "alcance"],
  hitModifier: ["hit", "hit%", "hit modifier", "modificador"],
  imbuementSlots: ["slots", "imbue", "imbuement", "imbuements", "slot"],
  tier: ["tier", "classificacao", "classificação"],
  weightOz: ["peso", "weight", "oz"]
};

if (!readonly) await fs.mkdir(generatedDir, { recursive: true });

const scannedAt = new Date().toISOString();
const existingEquipment = await readJson(equipmentPath, []);
const items = await readJson(itemsPath, []);
const files = await findReadableFiles(repositoryDir);
const fileReports = [];
const candidatesByKey = new Map();
const skippedFiles = [];
let rawCandidateRows = 0;

for (const filePath of files) {
  const relativePath = path.relative(rootDir, filePath);
  if (shouldIgnorePath(relativePath)) {
    skippedFiles.push({ filePath: relativePath, reason: "not-equipment-source" });
    continue;
  }

  const stat = await fs.stat(filePath);

  if (stat.size > maxFileBytes) {
    skippedFiles.push({ filePath: relativePath, reason: "file-too-large", size: stat.size });
    continue;
  }

  const ext = path.extname(filePath).toLowerCase();
  const sourceHint = inferSourceHint(relativePath);
  const extraction = await extractRows(filePath, ext, sourceHint);
  const rows = extraction.rows;
  const candidates = rows
    .map((row) => rowToCandidate(row, relativePath, sourceHint))
    .filter(Boolean);
  rawCandidateRows += candidates.length;

  for (const candidate of candidates) {
    const key = normalizeKey(candidate.name);
    if (!key) continue;
    const current = candidatesByKey.get(key);
    if (current && getCandidateCompletenessScore(current) >= getCandidateCompletenessScore(candidate)) continue;
    candidatesByKey.set(key, candidate);
  }

  fileReports.push({
    filePath: relativePath,
    extension: ext,
    size: stat.size,
    sourceHint,
    extractionStatus: extraction.status,
    rowsRead: rows.length,
    candidatesFound: candidates.length
  });
}

const candidates = Array.from(candidatesByKey.values())
  .map((candidate) => enrichCandidate(candidate, existingEquipment, items))
  .sort((a, b) => a.name.localeCompare(b.name));

const readyCandidates = candidates.filter((candidate) => candidate.reviewStatus === "ready");
const reviewCandidates = candidates.filter((candidate) => candidate.reviewStatus !== "ready");

const report = {
  scannedAt,
  repositoryDir: "files_repository",
  filesScanned: fileReports.length,
  filesSkipped: skippedFiles.length,
  rawCandidateRows,
  duplicatedCandidateNames: Math.max(0, rawCandidateRows - candidates.length),
  candidatesFound: candidates.length,
  readyCandidates: readyCandidates.length,
  reviewCandidates: reviewCandidates.length,
  alreadyInEquipmentDatabase: candidates.filter((candidate) => candidate.alreadyExists).length,
  matchedLocalItems: candidates.filter((candidate) => candidate.itemMatch).length,
  byCategory: countBy(candidates, (candidate) => candidate.category ?? "unknown"),
  byWeaponType: countBy(candidates, (candidate) => candidate.weaponType ?? "none")
};

if (!readonly) {
  await writeJson(path.join(generatedDir, "equipment-scan-report.json"), report);
  await writeJson(path.join(generatedDir, "equipment-source-files-report.json"), {
    scannedAt,
    files: fileReports,
    skippedFiles
  });
  await writeJson(path.join(generatedDir, "equipment-import-candidates.json"), {
    scannedAt,
    note: "Review these rows before promoting anything to data/equipment.json.",
    candidates
  });
  await writeJson(path.join(generatedDir, "equipment-ready-candidates.json"), {
    scannedAt,
    candidates: readyCandidates
  });
  await writeJson(path.join(generatedDir, "equipment-review-needed.json"), {
    scannedAt,
    candidates: reviewCandidates
  });
}

console.log("Equipment repository scan completed");
if (readonly) console.log("Readonly mode: equipment scan reports were not rewritten.");
console.log(JSON.stringify(report, null, 2));

async function extractRows(filePath, ext, sourceHint) {
  if (ext === ".pdf") return extractPdfRows(filePath, sourceHint);

  const raw = await fs.readFile(filePath, "utf8");
  if (ext === ".json") return extractJsonRows(raw);
  if (ext === ".csv" || ext === ".tsv") return extractDelimitedRows(raw, ext === ".tsv" ? "\t" : ",");
  if (ext === ".html" || ext === ".htm") {
    const parsed = extractHtmlRowsWithPython(filePath);
    if (parsed.status === "html-lxml" && parsed.rows.length) return parsed;
    return extractHtmlTableRows(raw);
  }
  return { rows: extractTextRows(raw, sourceHint), status: "text" };
}

function extractJsonRows(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return { rows: parsed.filter((row) => row && typeof row === "object"), status: "json" };
    if (Array.isArray(parsed.items)) return { rows: parsed.items.filter((row) => row && typeof row === "object"), status: "json" };
    if (Array.isArray(parsed.equipment)) return { rows: parsed.equipment.filter((row) => row && typeof row === "object"), status: "json" };
  } catch {
    return { rows: [], status: "json-parse-failed" };
  }
  return { rows: [], status: "json-no-array" };
}

function extractDelimitedRows(raw, delimiter) {
  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return { rows: [], status: "delimited-no-rows" };
  const headers = splitDelimitedLine(lines[0], delimiter).map(cleanCell);
  const rows = lines.slice(1).map((line) => {
    const values = splitDelimitedLine(line, delimiter).map(cleanCell);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  });
  return { rows, status: "delimited" };
}

function extractHtmlTableRows(raw) {
  const tables = raw.match(/<table[\s\S]*?<\/table>/gi) ?? [];
  const rows = [];

  for (const table of tables) {
    const tableRows = table.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];
    if (tableRows.length < 2) continue;
    const headers = extractCells(tableRows[0]).map(cleanCell);
    if (!headers.length) continue;

    for (const rowHtml of tableRows.slice(1)) {
      const cells = extractCells(rowHtml).map(cleanCell);
      if (cells.length < 2) continue;
      rows.push(Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
    }
  }

  return { rows, status: "html-tables" };
}

function extractHtmlRowsWithPython(filePath) {
  const python = process.env.REINAHUB_PYTHON || process.env.PYTHON || "python";
  const script = `
import json, sys
try:
    from lxml import html
except Exception as exc:
    print(json.dumps({"ok": False, "error": "lxml-missing: " + str(exc)}))
    raise SystemExit(0)

html_path = sys.argv[1]
raw = open(html_path, "rb").read()
doc = html.fromstring(raw)
tables = doc.xpath('//table[@id="tabelaDPL"]')
if not tables:
    tables = doc.xpath('//table[contains(concat(" ", normalize-space(@class), " "), " sortable ")]')
rows = []
for table in tables[:1]:
    header_row = (table.xpath('./thead/tr') or table.xpath('./tbody/tr') or table.xpath('./tr') or [None])[0]
    if header_row is None:
        continue
    headers = [" ".join(cell.text_content().split()) for cell in header_row.xpath('./th|./td')]
    for row in table.xpath('./tbody/tr|./tr')[1:]:
        cells = [" ".join(cell.text_content().split()) for cell in row.xpath('./th|./td')]
        if len(cells) < 2:
            continue
        rows.append({headers[i] if i < len(headers) and headers[i] else f"col_{i}": cells[i] for i in range(len(cells))})
print(json.dumps({"ok": True, "rows": rows}))
`;

  const env = { ...process.env };
  if (process.env.REINAHUB_PYTHONPATH) env.PYTHONPATH = process.env.REINAHUB_PYTHONPATH;

  const result = spawnSync(python, ["-c", script, filePath], {
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    env
  });

  if (result.error) return { rows: [], status: `html-lxml-failed: ${result.error.message}` };

  try {
    const payload = JSON.parse(result.stdout || "{}");
    if (!payload.ok) return { rows: [], status: payload.error ?? "html-lxml-failed" };
    return { rows: payload.rows ?? [], status: "html-lxml" };
  } catch {
    return { rows: [], status: "html-lxml-invalid-output" };
  }
}

function extractTextRows(raw, sourceHint = {}) {
  const rows = [];
  for (const line of raw.split(/\r?\n/)) {
    const text = cleanCell(line);
    if (!text || text.length > 180) continue;
    const tableRow = parseEquipmentTextLine(text, sourceHint);
    if (tableRow) {
      rows.push(tableRow);
      continue;
    }
    const match = text.match(/^(.+?)\s+(?:atk|attack|ataque)\s*[:=]?\s*(\d+)/i);
    if (match) rows.push({ name: match[1], attack: match[2] });
  }
  return rows;
}

function extractPdfRows(filePath, sourceHint) {
  const python = process.env.REINAHUB_PYTHON || process.env.PYTHON || "python";
  const script = `
import json, sys
try:
    import pdfplumber
except Exception as exc:
    print(json.dumps({"ok": False, "error": "pdfplumber-missing: " + str(exc)}))
    raise SystemExit(0)

pdf_path = sys.argv[1]
pages = []
with pdfplumber.open(pdf_path) as doc:
    for page in doc.pages:
        pages.append(page.extract_text() or "")
print(json.dumps({"ok": True, "text": "\\n".join(pages)}))
`;

  const env = { ...process.env };
  if (process.env.REINAHUB_PYTHONPATH) {
    env.PYTHONPATH = process.env.REINAHUB_PYTHONPATH;
  }

  const result = spawnSync(python, ["-c", script, filePath], {
    encoding: "utf8",
    maxBuffer: 30 * 1024 * 1024,
    env
  });

  if (result.error) return { rows: [], status: `pdf-extract-failed: ${result.error.message}` };

  try {
    const payload = JSON.parse(result.stdout || "{}");
    if (!payload.ok) return { rows: [], status: payload.error ?? "pdf-extract-failed" };
    return { rows: extractTextRows(payload.text ?? "", sourceHint), status: "pdf-text" };
  } catch {
    return { rows: [], status: "pdf-extract-invalid-output" };
  }
}

function parseEquipmentTextLine(text, sourceHint) {
  const pattern = /^(.+?)\s+(\d{1,4})\s+(Todas|Knights|Paladins|Sorcerers|Druids|All)\s+(Uma|Duas|One|Two)\s+(-?\d+)\s+(Nenhum|None|\d+\s+[A-Za-zÀ-ÿ]+)\s+(-?\d+)\s+([+-]\d+|0)\s+(.+?)\s+(\d+)\s+(\d+)\s+(\d+(?:[.,]\d+)?)\s+.+$/i;
  const match = text.match(pattern);
  if (!match) return null;

  const [, name, level, vocations, hands, attack, elemental, defense, defenseModifier, bonus, slots, tier, weight] = match;
  const elementMatch = elemental.match(/(?:\d+\s+)?([A-Za-zÀ-ÿ]+)$/);
  const element = elemental.toLowerCase().includes("nenhum") || elemental.toLowerCase().includes("none")
    ? ""
    : elementMatch?.[1] ?? elemental;

  return {
    name,
    level,
    vocations,
    hands,
    attack,
    defense,
    defenseModifier,
    bonus,
    element,
    imbuementSlots: slots,
    tier,
    weightOz: weight,
    category: sourceHint.category ?? "weapon",
    weaponType: sourceHint.weaponType
  };
}

function getCandidateCompletenessScore(candidate) {
  let score = 0;
  if (candidate.sourcePath?.toLowerCase().endsWith(".pdf")) score += 6;
  if (candidate.attack !== null && candidate.attack !== undefined) score += 4;
  if (candidate.defense !== null && candidate.defense !== undefined) score += 4;
  if (candidate.armor !== null && candidate.armor !== undefined) score += 4;
  if (candidate.weightOz !== null && candidate.weightOz !== undefined) score += 3;
  if (candidate.imbuementSlots !== null && candidate.imbuementSlots !== undefined) score += 3;
  if (candidate.level !== null && candidate.level !== undefined) score += 2;
  if (candidate.hands !== null && candidate.hands !== undefined) score += 2;
  return score;
}

function rowToCandidate(row, sourcePath, sourceHint) {
  const normalizedRow = normalizeRowKeys(row);
  const name = normalizedRow.name?.trim();
  if (!name || name.length < 3 || /^(nome|name|item)$/i.test(name)) return null;

  const category = sourceHint.category ?? inferCategory(normalizedRow, name);
  const weaponType = sourceHint.weaponType ?? inferWeaponType(normalizedRow, name);
  const hasEquipmentSignal = Boolean(
    sourceHint.category ||
    sourceHint.weaponType ||
    normalizedRow.attack ||
    normalizedRow.defense ||
    normalizedRow.armor ||
    normalizedRow.weightOz ||
    normalizedRow.imbuementSlots ||
    normalizedRow.level
  );

  if (!hasEquipmentSignal) return null;

  const slot = category === "weapon" ? "weapon" : category;

  return {
    proposedId: slugify(name),
    name,
    category,
    slot,
    weaponType,
    level: toNumber(normalizedRow.level),
    vocations: parseList(normalizedRow.vocations),
    hands: toHands(normalizedRow.hands),
    attack: toNumber(normalizedRow.attack),
    defense: toNumber(normalizedRow.defense),
    armor: toNumber(normalizedRow.armor),
    element: normalizedRow.element || null,
    range: toNumber(normalizedRow.range),
    hitModifier: toNumber(normalizedRow.hitModifier),
    imbuementSlots: toNumber(normalizedRow.imbuementSlots),
    tier: toNumber(normalizedRow.tier),
    weightOz: toNumber(normalizedRow.weightOz),
    sourcePath,
    sourceStatus: "manual-review"
  };
}

function enrichCandidate(candidate, existingEquipment, items) {
  const key = normalizeKey(candidate.name);
  const alreadyExists = existingEquipment.some((equipment) => normalizeKey(equipment.name) === key || equipment.id === candidate.proposedId);
  const itemMatch = items.find((item) => normalizeKey(item.name) === key) ?? null;
  const hasCoreStats = hasCategoryCoreStats(candidate);
  const hasClassification = Boolean(candidate.category && candidate.slot);
  const reviewReasons = [];

  if (alreadyExists) reviewReasons.push("already-exists");
  if (!itemMatch) reviewReasons.push("no-local-item-match");
  if (!hasCoreStats) reviewReasons.push("missing-core-stats");
  if (!hasClassification) reviewReasons.push("missing-classification");

  return {
    ...candidate,
    itemMatch: itemMatch ? { id: itemMatch.id, clientId: itemMatch.clientId ?? null, name: itemMatch.name } : null,
    alreadyExists,
    reviewStatus: reviewReasons.length === 0 ? "ready" : "review-required",
    reviewReasons
  };
}

function hasCategoryCoreStats(candidate) {
  if (candidate.category === "weapon") return candidate.weaponType === "ammo" || hasNumber(candidate.attack) || hasNumber(candidate.range);
  if (candidate.category === "shield") return hasNumber(candidate.defense);
  if (["armor", "helmet", "legs", "boots"].includes(candidate.category)) return hasNumber(candidate.armor);
  if (candidate.category === "container") return true;
  return Boolean(hasNumber(candidate.attack) || hasNumber(candidate.defense) || hasNumber(candidate.armor));
}

function hasNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function normalizeRowKeys(row) {
  const output = {};
  for (const [key, value] of Object.entries(row)) {
    const mapped = canonicalFieldName(key) ?? mapHeader(key);
    if (mapped && output[mapped] === undefined) output[mapped] = cleanCell(String(value ?? ""));
  }
  return output;
}

function canonicalFieldName(key) {
  if (Object.prototype.hasOwnProperty.call(headerAliases, key)) return key;
  if (["category", "slot", "weaponType", "sourceStatus", "defenseModifier", "bonus"].includes(key)) return key;
  return null;
}

function mapHeader(header) {
  const key = normalizeKey(header);
  for (const [canonical, aliases] of Object.entries(headerAliases)) {
    if (aliases.some((alias) => key === normalizeKey(alias) || key.includes(normalizeKey(alias)))) {
      return canonical;
    }
  }
  return null;
}

function inferSourceHint(filePath) {
  const key = normalizeKey(filePath);
  if (key.includes("espada") || key.includes("sword")) return { category: "weapon", weaponType: "sword" };
  if (key.includes("machado") || key.includes("axe")) return { category: "weapon", weaponType: "axe" };
  if (key.includes("clava") || key.includes("club") || key.includes("mace") || key.includes("hammer")) return { category: "weapon", weaponType: "club" };
  if (key.includes("distancia") || key.includes("distance") || key.includes("bow") || key.includes("crossbow")) return { category: "weapon", weaponType: "distance" };
  if (key.includes("municao") || key.includes("ammo")) return { category: "weapon", weaponType: "ammo" };
  if (key.includes("punhos") || key.includes("fist")) return { category: "weapon", weaponType: "fist" };
  if (key.includes("wand")) return { category: "weapon", weaponType: "wand" };
  if (key.includes("rod")) return { category: "weapon", weaponType: "rod" };
  if (key.includes("shield") || key.includes("escudo")) return { category: "shield" };
  if (key.includes("spellbook")) return { category: "shield" };
  if (key.includes("armor") || key.includes("armadura")) return { category: "armor" };
  if (key.includes("helmet") || key.includes("elmo") || key.includes("capacete")) return { category: "helmet" };
  if (key.includes("legs") || key.includes("calca")) return { category: "legs" };
  if (key.includes("boots") || key.includes("botas")) return { category: "boots" };
  if (key.includes("aljava") || key.includes("recipiente") || key.includes("container")) return { category: "container" };
  return {};
}

function shouldIgnorePath(filePath) {
  const key = normalizeKey(filePath.replace(/\\/g, "/"));
  return ignoredPathFragments.some((fragment) => key.includes(normalizeKey(fragment)));
}

function inferCategory(row, name) {
  const key = normalizeKey(`${name} ${row.category ?? ""} ${row.slot ?? ""}`);
  if (key.includes("shield")) return "shield";
  if (key.includes("armor")) return "armor";
  if (key.includes("helmet")) return "helmet";
  if (key.includes("legs")) return "legs";
  if (key.includes("boots")) return "boots";
  if (row.attack || row.range) return "weapon";
  return "weapon";
}

function inferWeaponType(row, name) {
  const key = normalizeKey(`${name} ${row.weaponType ?? ""}`);
  if (key.includes("sword") || key.includes("blade") || key.includes("sabre")) return "sword";
  if (key.includes("axe")) return "axe";
  if (key.includes("club") || key.includes("mace") || key.includes("hammer")) return "club";
  if (key.includes("bow") || key.includes("crossbow")) return "distance";
  if (key.includes("wand")) return "wand";
  if (key.includes("rod")) return "rod";
  return undefined;
}

async function findReadableFiles(dir) {
  const files = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...await findReadableFiles(fullPath));
      } else if (entry.isFile() && readableExtensions.has(path.extname(entry.name).toLowerCase())) {
        files.push(fullPath);
      }
    }
  } catch {
    return files;
  }
  return files;
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function extractCells(rowHtml) {
  return [...rowHtml.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((match) => htmlToText(match[1]));
}

function htmlToText(value) {
  return String(value)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function splitDelimitedLine(line, delimiter) {
  const values = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === delimiter && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function cleanCell(value) {
  return htmlToText(value)
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const match = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function toHands(value) {
  const key = normalizeKey(value);
  if (key === "uma" || key === "one" || key === "1") return 1;
  if (key === "duas" || key === "two" || key === "2") return 2;
  return toNumber(value);
}

function parseList(value) {
  if (!value) return [];
  return String(value)
    .split(/[,;/]| e | and /i)
    .map((part) => cleanCell(part))
    .filter(Boolean);
}

function normalizeKey(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

function slugify(value = "") {
  return normalizeKey(value).replace(/\s+/g, "-");
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}
