import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const featureDir = path.join(rootDir, "source", "web", "src", "features", "equipment-database");
const reviewNeededPath = path.join(featureDir, "generated", "equipment-review-needed.json");
const queuePath = path.join(featureDir, "generated", "equipment-manual-review-queue.json");
const manualReviewPath = path.join(featureDir, "data", "equipment-manual-review.json");

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function getMissingFields(candidate) {
  const missing = [];
  if (!candidate.itemMatch) missing.push("itemAliasOrItemId");

  if (candidate.category === "weapon") {
    if (candidate.weaponType === "distance") {
      if (candidate.range == null) missing.push("range");
    } else if (candidate.weaponType === "wand" || candidate.weaponType === "rod") {
      if (candidate.range == null) missing.push("range");
      if (!candidate.element) missing.push("element");
    } else if (candidate.weaponType !== "ammo" && candidate.attack == null) {
      missing.push("attack");
    }
  }

  if (candidate.category === "shield" && candidate.defense == null) missing.push("defense");
  if (["armor", "helmet", "legs", "boots"].includes(candidate.category) && candidate.armor == null) {
    missing.push("armor");
  }

  return missing;
}

function getSuggestedAction(candidate) {
  const reasons = candidate.reviewReasons ?? [];
  if (reasons.length === 1 && reasons.includes("already-exists")) return "ignore-existing";
  if (reasons.includes("no-local-item-match") && reasons.includes("missing-core-stats")) {
    return "map-local-item-and-fill-stats";
  }
  if (reasons.includes("no-local-item-match")) return "map-local-item";
  if (reasons.includes("missing-core-stats")) return "fill-stats";
  return "review";
}

function toQueueEntry(candidate) {
  return {
    proposedId: candidate.proposedId,
    name: candidate.name,
    category: candidate.category,
    slot: candidate.slot,
    weaponType: candidate.weaponType ?? null,
    reviewReasons: candidate.reviewReasons ?? [],
    suggestedAction: getSuggestedAction(candidate),
    missingFields: getMissingFields(candidate),
    itemMatch: candidate.itemMatch,
    currentExtracted: {
      level: candidate.level,
      vocations: candidate.vocations ?? [],
      hands: candidate.hands,
      attack: candidate.attack,
      defense: candidate.defense,
      armor: candidate.armor,
      element: candidate.element,
      range: candidate.range,
      hitModifier: candidate.hitModifier,
      imbuementSlots: candidate.imbuementSlots,
      tier: candidate.tier,
      weightOz: candidate.weightOz
    },
    sourcePath: candidate.sourcePath
  };
}

function toManualEntry(entry) {
  return {
    status: "pending",
    proposedId: entry.proposedId,
    name: entry.name,
    itemId: entry.itemMatch?.id ?? null,
    itemAlias: null,
    category: entry.category,
    slot: entry.slot,
    weaponType: entry.weaponType,
    level: entry.currentExtracted.level,
    vocations: entry.currentExtracted.vocations,
    hands: entry.currentExtracted.hands,
    attack: entry.currentExtracted.attack,
    defense: entry.currentExtracted.defense,
    armor: entry.currentExtracted.armor,
    element: entry.currentExtracted.element,
    range: entry.currentExtracted.range,
    hitModifier: entry.currentExtracted.hitModifier,
    imbuementSlots: entry.currentExtracted.imbuementSlots,
    tier: entry.currentExtracted.tier,
    weightOz: entry.currentExtracted.weightOz,
    reviewNotes: "",
    sourcePath: entry.sourcePath
  };
}

function prepare() {
  const payload = readJson(reviewNeededPath, { candidates: [] });
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const entries = candidates.map(toQueueEntry);
  const actionable = entries.filter((entry) => entry.suggestedAction !== "ignore-existing");
  const alreadyExisting = entries.filter((entry) => entry.suggestedAction === "ignore-existing");

  const queue = {
    generatedAt: new Date().toISOString(),
    totalReviewNeeded: entries.length,
    actionableCount: actionable.length,
    alreadyExistingCount: alreadyExisting.length,
    bySuggestedAction: countBy(entries, (entry) => entry.suggestedAction),
    actionable,
    alreadyExisting
  };

  writeJson(queuePath, queue);

  const currentManual = readJson(manualReviewPath, null);
  const currentReviews = Array.isArray(currentManual?.reviews) ? currentManual.reviews : [];
  const currentIds = new Set(currentReviews.map((entry) => entry.proposedId));
  const nextReviews = [
    ...currentReviews,
    ...actionable.filter((entry) => !currentIds.has(entry.proposedId)).map(toManualEntry)
  ];

  writeJson(manualReviewPath, {
    updatedAt: new Date().toISOString(),
    instructions: [
      "Edite apenas entradas com status pending.",
      "Use status approved para promover para equipment.json.",
      "Use status ignored para manter fora da base.",
      "Preencha os campos faltantes apontados em generated/equipment-manual-review-queue.json."
    ],
    reviews: nextReviews
  });

  console.log(JSON.stringify({
    generatedQueue: path.relative(rootDir, queuePath),
    manualReviewFile: path.relative(rootDir, manualReviewPath),
    actionableCount: actionable.length,
    alreadyExistingCount: alreadyExisting.length,
    addedToManualReview: nextReviews.length - currentReviews.length
  }, null, 2));
}

function countBy(rows, getKey) {
  return rows.reduce((acc, row) => {
    const key = getKey(row);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

prepare();
