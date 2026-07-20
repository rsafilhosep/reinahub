import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const featureDir = path.join(rootDir, "source", "web", "src", "features", "equipment-database");
const equipmentPath = path.join(featureDir, "data", "equipment.json");
const readyPath = path.join(featureDir, "generated", "equipment-ready-candidates.json");
const generatedDir = path.join(featureDir, "generated");
const backupDir = path.join(generatedDir, "backups");
const reportPath = path.join(generatedDir, "equipment-promotion-report.json");
const promotedItemsPath = path.join(generatedDir, "equipment-promoted-items.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’`´]/g, "'")
    .replace(/[^a-zA-Z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function addIfNumber(target, key, value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    target[key] = value;
  }
}

function addIfText(target, key, value) {
  if (typeof value === "string" && value.trim()) {
    target[key] = value.trim();
  }
}

function toEquipmentRecord(candidate) {
  const record = {
    id: candidate.proposedId,
    name: candidate.name,
    category: candidate.category,
    slot: candidate.slot || candidate.category,
    sourceStatus: "imported"
  };

  addIfText(record, "weaponType", candidate.weaponType);
  addIfNumber(record, "level", candidate.level ?? 0);
  if (Array.isArray(candidate.vocations) && candidate.vocations.length > 0) {
    record.vocations = candidate.vocations;
  }
  addIfNumber(record, "hands", candidate.hands);
  addIfNumber(record, "attack", candidate.attack);
  addIfNumber(record, "defense", candidate.defense);
  addIfNumber(record, "armor", candidate.armor);
  addIfText(record, "element", candidate.element);
  addIfNumber(record, "range", candidate.range);
  addIfNumber(record, "hitModifier", candidate.hitModifier);
  addIfNumber(record, "speed", candidate.speed);
  addIfNumber(record, "imbuementSlots", candidate.imbuementSlots);
  if (typeof candidate.tier === "number" && Number.isFinite(candidate.tier)) {
    record.tier = candidate.tier;
  }
  addIfNumber(record, "weightOz", candidate.weightOz);
  addIfText(record, "sourceUrl", candidate.sourceUrl);
  addIfText(record, "sourcePath", candidate.sourcePath);

  return record;
}

function sortEquipment(left, right) {
  const categoryCompare = String(left.category).localeCompare(String(right.category), "en");
  if (categoryCompare !== 0) return categoryCompare;

  const weaponCompare = String(left.weaponType ?? "").localeCompare(String(right.weaponType ?? ""), "en");
  if (weaponCompare !== 0) return weaponCompare;

  return String(left.name).localeCompare(String(right.name), "en");
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "none";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function promote() {
  const existing = readJson(equipmentPath, []);
  const readyPayload = readJson(readyPath, { candidates: [] });
  const candidates = Array.isArray(readyPayload.candidates) ? readyPayload.candidates : [];

  const seenIds = new Set(existing.map((item) => item.id));
  const seenNames = new Set(existing.map((item) => normalizeName(item.name)));
  const promoted = [];
  const skipped = [];

  for (const candidate of candidates) {
    if (candidate.reviewStatus !== "ready") {
      skipped.push({ name: candidate.name, reason: "review-status-not-ready" });
      continue;
    }

    if (candidate.alreadyExists) {
      skipped.push({ name: candidate.name, id: candidate.proposedId, reason: "candidate-marked-existing" });
      continue;
    }

    const id = String(candidate.proposedId ?? "").trim();
    const nameKey = normalizeName(candidate.name);

    if (!id || !candidate.name || !candidate.category) {
      skipped.push({ name: candidate.name, id, reason: "missing-required-field" });
      continue;
    }

    if (seenIds.has(id)) {
      skipped.push({ name: candidate.name, id, reason: "duplicate-id" });
      continue;
    }

    if (seenNames.has(nameKey)) {
      skipped.push({ name: candidate.name, id, reason: "duplicate-name" });
      continue;
    }

    const record = toEquipmentRecord(candidate);
    promoted.push(record);
    seenIds.add(record.id);
    seenNames.add(normalizeName(record.name));
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `equipment-${toTimestamp()}.json`);
  writeJson(backupPath, existing);

  const nextEquipment = [...existing, ...promoted].sort(sortEquipment);
  writeJson(equipmentPath, nextEquipment);
  writeJson(promotedItemsPath, promoted);

  const report = {
    promotedAt: new Date().toISOString(),
    source: path.relative(rootDir, readyPath),
    backupPath: path.relative(rootDir, backupPath),
    previousTotal: existing.length,
    candidatesRead: candidates.length,
    promotedCount: promoted.length,
    skippedCount: skipped.length,
    newTotal: nextEquipment.length,
    promotedByCategory: countBy(promoted, "category"),
    promotedByWeaponType: countBy(promoted, "weaponType"),
    skipped
  };
  writeJson(reportPath, report);

  console.log(JSON.stringify(report, null, 2));
}

promote();
