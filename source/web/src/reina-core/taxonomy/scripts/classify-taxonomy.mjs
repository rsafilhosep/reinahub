import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const databaseRoot = path.join(root, "source", "web", "src", "reina-core", "database", "generated");
const taxonomyRoot = path.join(root, "source", "web", "src", "reina-core", "taxonomy");
const outputRoot = path.join(taxonomyRoot, "generated");

const items = readJson(path.join(databaseRoot, "items.json"));
const monsters = readJson(path.join(databaseRoot, "monsters.json"));
const manual = readJson(path.join(taxonomyRoot, "manual-classifications.json"));
const creatureClasses = readJson(path.join(taxonomyRoot, "creature-classes.json"));
const itemCategories = readJson(path.join(taxonomyRoot, "item-categories.json"));
const equipmentSlots = readJson(path.join(taxonomyRoot, "equipment-slots.json"));
const weaponTypes = readJson(path.join(taxonomyRoot, "weapon-types.json"));

mkdirSync(outputRoot, { recursive: true });

const classifiedItems = items.map(classifyItem);
const classifiedMonsters = monsters.map(classifyMonster);
const unclassifiedItems = classifiedItems.filter((item) => item.confidence === "unclassified");
const unclassifiedMonsters = classifiedMonsters.filter((monster) => monster.confidence === "unclassified");

const itemSummary = summarizeBy(classifiedItems, "category");
const monsterSummary = summarizeBy(
  classifiedMonsters.filter((monster) => monster.creatureClass),
  "creatureClass"
);

const report = {
  generatedAt: new Date().toISOString(),
  taxonomy: {
    creatureClasses: creatureClasses.length,
    itemCategories: itemCategories.length,
    equipmentSlots: equipmentSlots.length,
    weaponTypes: weaponTypes.length
  },
  items: {
    total: items.length,
    classified: classifiedItems.length - unclassifiedItems.length,
    unclassified: unclassifiedItems.length,
    byCategory: itemSummary,
    byConfidence: summarizeBy(classifiedItems, "confidence")
  },
  monsters: {
    total: monsters.length,
    classified: classifiedMonsters.length - unclassifiedMonsters.length,
    unclassified: unclassifiedMonsters.length,
    byCreatureClass: monsterSummary,
    byConfidence: summarizeBy(classifiedMonsters, "confidence")
  },
  notes: [
    "Generated taxonomy is a review layer. It does not modify ReinaDataService canonical JSONs.",
    "Low and medium confidence rows should be reviewed before becoming trusted canonical data.",
    "Manual fixes belong in manual-classifications.json."
  ]
};

writeJson(path.join(outputRoot, "classified-items.json"), classifiedItems);
writeJson(path.join(outputRoot, "classified-monsters.json"), classifiedMonsters);
writeJson(path.join(outputRoot, "unclassified-items.json"), unclassifiedItems);
writeJson(path.join(outputRoot, "unclassified-monsters.json"), unclassifiedMonsters);
writeJson(path.join(outputRoot, "taxonomy-report.json"), report);

console.log("Taxonomy classification complete");
console.log({
  items: report.items,
  monsters: report.monsters
});

function classifyItem(item) {
  const key = lookupKey(item.name);
  const manualItem = manual.items?.[String(item.id)] ?? manual.items?.[key];
  if (manualItem?.category) {
    return {
      itemId: item.id,
      name: item.name,
      category: manualItem.category,
      slot: manualItem.slot,
      weaponType: manualItem.weaponType,
      confidence: manualItem.confidence ?? "high",
      matchedBy: "manual"
    };
  }

  return {
    itemId: item.id,
    name: item.name,
    ...classifyItemByName(key)
  };
}

function classifyMonster(monster) {
  const key = lookupKey(monster.name);
  const manualMonster = manual.monsters?.[key];
  if (manualMonster?.creatureClass) {
    return {
      name: monster.name,
      creatureClass: manualMonster.creatureClass,
      confidence: manualMonster.confidence ?? "high",
      matchedBy: "manual"
    };
  }

  return {
    name: monster.name,
    ...classifyMonsterByName(key)
  };
}

function classifyItemByName(key) {
  if (isAny(key, ["gold coin", "platinum coin", "crystal coin", "tibia coin"])) {
    return { category: "currency", confidence: "high", matchedBy: "currency-exact" };
  }

  if (hasAny(key, [" coin", " token"]) || key.endsWith("coin") || key.endsWith("token")) {
    return { category: "currency", confidence: "medium", matchedBy: "currency-name" };
  }

  const slot = getEquipmentSlot(key);
  if (slot) return { category: slot, slot, confidence: "medium", matchedBy: `equipment-slot:${slot}` };

  const weaponType = getWeaponType(key);
  if (weaponType) return { category: "weapon", weaponType, confidence: "medium", matchedBy: `weapon-type:${weaponType}` };

  if (hasAny(key, [" potion", "fluid", " flask"]) || key.endsWith("potion")) {
    return { category: "potion", confidence: "medium", matchedBy: "potion-name" };
  }

  if (hasAny(key, [" rune"]) || key.endsWith("rune")) {
    return { category: "rune", confidence: "medium", matchedBy: "rune-name" };
  }

  if (hasAny(key, ["backpack", "bag", "box", "chest", "crate"])) {
    return { category: "container", confidence: "low", matchedBy: "container-name" };
  }

  if (isFoodName(key)) return { category: "food", confidence: "medium", matchedBy: "food-name" };
  if (isCreatureProductName(key)) return { category: "creature-product", confidence: "low", matchedBy: "creature-product-name" };

  if (hasAny(key, ["book", "scroll", "document", "paper", "parchment"])) {
    return { category: "book", confidence: "low", matchedBy: "book-name" };
  }

  return { category: "misc", confidence: "unclassified", matchedBy: "none" };
}

function classifyMonsterByName(key) {
  const rules = [
    ["dragon", ["dragon", "draken", "wyrm", "frost dragon"], "medium"],
    ["demon", ["demon", "hellhound", "hellfire", "juggernaut", "plaguesmith", "vexclaw"], "medium"],
    ["undead", ["undead", "skeleton", "zombie", "vampire", "ghost", "ghoul", "mummy", "lich", "banshee", "reaper"], "medium"],
    ["vermin", ["rat", "spider", "bug", "worm", "wasp", "scorpion", "larva", "beetle", "crawler", "centipede"], "medium"],
    ["aquatic", ["quara", "calamary", "shark", "crab", "fish", "deepling", "squid"], "medium"],
    ["amphibic", ["frog", "toad", "salamander"], "medium"],
    ["bird", ["bird", "chicken", "parrot", "flamingo", "feather", "penguin"], "low"],
    ["construct", ["golem", "construct", "machine", "generator", "worker golem"], "medium"],
    ["elemental", ["elemental", "fire", "energy", "ice", "earth"], "low"],
    ["giant", ["giant", "cyclops", "troll champion"], "medium"],
    ["plant", ["plant", "tree", "fungus", "carniphila", "spit nettle"], "medium"],
    ["reptile", ["lizard", "snake", "serpent", "crocodile", "tortoise", "turtle"], "medium"],
    ["slime", ["slime", "blob"], "medium"],
    ["lycanthrope", ["were", "werewolf", "werebear", "wereboar", "werebadger", "werefox"], "medium"],
    ["human", ["amazon", "assassin", "bandit", "hunter", "monk", "pirate", "smuggler", "valkyrie", "warlock"], "low"],
    ["humanoid", ["orc", "minotaur", "elf", "dwarf", "goblin", "troll", "corym"], "medium"],
    ["mammal", ["bear", "deer", "dog", "wolf", "lion", "tiger", "bat", "boar", "mammoth", "elephant"], "low"],
    ["magical", ["djinn", "fairy", "wisp", "phantasm", "spectre"], "low"],
    ["fey", ["faun", "pixie", "nymph", "swan maiden"], "low"],
    ["extra-dimensional", ["astral", "reality", "void", "rift"], "low"],
    ["inkborn", ["ink", "squidgy"], "low"],
    ["bane", ["bane"], "low"]
  ];

  for (const [creatureClass, terms, confidence] of rules) {
    if (hasAny(key, terms)) {
      return { creatureClass, confidence, matchedBy: `name-rule:${creatureClass}` };
    }
  }

  return { confidence: "unclassified", matchedBy: "none" };
}

function getEquipmentSlot(key) {
  const slotTerms = [
    ["helmet", ["helmet", "hat", "hood", "crown", "tiara", "mask"]],
    ["armor", ["armor", "coat", "robe", "jacket", "mail", "tunic", "garment"]],
    ["legs", ["legs", "trousers", "shorts", "skirt"]],
    ["boots", ["boots", "shoes", "sandals"]],
    ["shield", ["shield", "spellbook"]],
    ["amulet", ["amulet", "necklace", "scarf"]],
    ["ring", [" ring"]],
    ["backpack", ["backpack"]]
  ];

  return slotTerms.find(([, terms]) => hasAny(key, terms))?.[0];
}

function getWeaponType(key) {
  const weaponTerms = [
    ["sword", ["sword", "blade", "sabre", "saber", "katana", "rapier"]],
    ["axe", ["axe", "hatchet", "halberd"]],
    ["club", ["club", "mace", "hammer", "maul", "staff"]],
    ["distance", ["bow", "crossbow", "spear", "throwing star", "throwing knife"]],
    ["wand", ["wand"]],
    ["rod", ["rod"]],
    ["ammunition", ["arrow", "bolt"]]
  ];

  return weaponTerms.find(([, terms]) => hasAny(key, terms))?.[0];
}

function isFoodName(key) {
  return hasAny(key, ["apple", "banana", "bread", "carrot", "cheese", "cookie", "fish", "ham", "meat", "mushroom", "pear", "shrimp", "strawberry", "tomato"]);
}

function isCreatureProductName(key) {
  return hasAny(key, ["beak", "blood", "bone", "brain", "claw", "eye", "fang", "feather", "fur", "hide", "horn", "pelt", "scale", "shell", "silk", "skull", "tail", "teeth", "tooth", "tusk", "venom", "wing"]);
}

function summarizeBy(rows, field) {
  return rows.reduce((summary, row) => {
    const value = row[field] ?? "none";
    summary[value] = (summary[value] ?? 0) + 1;
    return summary;
  }, {});
}

function lookupKey(name = "") {
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
    .trim();
}

function isAny(value, options) {
  return options.includes(value);
}

function hasAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function readJson(filePath) {
  if (!existsSync(filePath)) throw new Error(`Missing JSON file: ${filePath}`);
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}
