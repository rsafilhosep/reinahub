import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const featureDir = path.join(rootDir, "source", "web", "src", "features", "equipment-database");
const equipmentPath = path.join(featureDir, "data", "equipment.json");
const manualReviewPath = path.join(featureDir, "data", "equipment-manual-review.json");
const generatedDir = path.join(featureDir, "generated");
const backupDir = path.join(generatedDir, "backups");
const reportPath = path.join(generatedDir, "equipment-apply-review-report.json");

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
    .replace(/[’`´'"]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toTimestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function addIfNumber(target, key, value) {
  if (typeof value === "number" && Number.isFinite(value)) target[key] = value;
}

function addIfText(target, key, value) {
  if (typeof value === "string" && value.trim()) target[key] = value.trim();
}

function hasRequiredStats(entry) {
  if (entry.category === "container") return true;
  if (entry.category === "shield") return entry.defense != null;
  if (["armor", "helmet", "legs", "boots"].includes(entry.category)) return entry.armor != null;
  if (entry.category === "weapon") {
    if (entry.weaponType === "ammo") return true;
    if (entry.weaponType === "distance") return entry.range != null || entry.attack != null;
    if (entry.weaponType === "wand" || entry.weaponType === "rod") return entry.range != null || entry.element;
    return entry.attack != null;
  }
  return false;
}

function toEquipmentRecord(entry) {
  const record = {
    id: entry.proposedId,
    name: entry.name,
    category: entry.category,
    slot: entry.slot || entry.category,
    sourceStatus: "manual-review"
  };

  addIfText(record, "weaponType", entry.weaponType);
  addIfNumber(record, "level", entry.level ?? 0);
  if (Array.isArray(entry.vocations) && entry.vocations.length > 0) record.vocations = entry.vocations;
  addIfNumber(record, "hands", entry.hands);
  addIfNumber(record, "attack", entry.attack);
  addIfNumber(record, "defense", entry.defense);
  addIfNumber(record, "armor", entry.armor);
  addIfText(record, "element", entry.element);
  addIfNumber(record, "range", entry.range);
  addIfNumber(record, "hitModifier", entry.hitModifier);
  addIfNumber(record, "imbuementSlots", entry.imbuementSlots);
  if (typeof entry.tier === "number" && Number.isFinite(entry.tier)) record.tier = entry.tier;
  addIfNumber(record, "weightOz", entry.weightOz);
  addIfText(record, "sourcePath", entry.sourcePath);

  return record;
}

function sortEquipment(left, right) {
  const categoryCompare = String(left.category).localeCompare(String(right.category), "en");
  if (categoryCompare !== 0) return categoryCompare;
  const weaponCompare = String(left.weaponType ?? "").localeCompare(String(right.weaponType ?? ""), "en");
  if (weaponCompare !== 0) return weaponCompare;
  return String(left.name).localeCompare(String(right.name), "en");
}

function applyReview() {
  const equipment = readJson(equipmentPath, []);
  const manual = readJson(manualReviewPath, { reviews: [] });
  const reviews = Array.isArray(manual.reviews) ? manual.reviews : [];
  const approved = reviews.filter((entry) => entry.status === "approved");
  const seenIds = new Set(equipment.map((item) => item.id));
  const seenNames = new Set(equipment.map((item) => normalizeName(item.name)));
  const promoted = [];
  const skipped = [];

  if (approved.length === 0) {
    const report = {
      appliedAt: new Date().toISOString(),
      previousTotal: equipment.length,
      approvedReviews: 0,
      promotedCount: 0,
      skippedCount: 0,
      newTotal: equipment.length,
      backupPath: null,
      skipped: []
    };
    writeJson(reportPath, report);
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  for (const entry of approved) {
    const id = String(entry.proposedId ?? "").trim();
    const nameKey = normalizeName(entry.name);

    if (!id || !entry.name || !entry.category) {
      skipped.push({ proposedId: id, name: entry.name, reason: "missing-required-field" });
      continue;
    }
    if (seenIds.has(id)) {
      skipped.push({ proposedId: id, name: entry.name, reason: "duplicate-id" });
      continue;
    }
    if (seenNames.has(nameKey)) {
      skipped.push({ proposedId: id, name: entry.name, reason: "duplicate-name" });
      continue;
    }
    if (!hasRequiredStats(entry)) {
      skipped.push({ proposedId: id, name: entry.name, reason: "missing-required-stats" });
      continue;
    }

    const record = toEquipmentRecord(entry);
    promoted.push(record);
    seenIds.add(record.id);
    seenNames.add(normalizeName(record.name));
  }

  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `equipment-before-manual-review-${toTimestamp()}.json`);
  writeJson(backupPath, equipment);

  const nextEquipment = [...equipment, ...promoted].sort(sortEquipment);
  writeJson(equipmentPath, nextEquipment);

  const report = {
    appliedAt: new Date().toISOString(),
    previousTotal: equipment.length,
    approvedReviews: approved.length,
    promotedCount: promoted.length,
    skippedCount: skipped.length,
    newTotal: nextEquipment.length,
    backupPath: path.relative(rootDir, backupPath),
    skipped
  };
  writeJson(reportPath, report);

  console.log(JSON.stringify(report, null, 2));
}

applyReview();
