import { itemLookupKey } from "@/source/web/src/reina-core/database";

import creatureClasses from "./creature-classes.json";
import equipmentSlots from "./equipment-slots.json";
import itemCategories from "./item-categories.json";
import manualClassifications from "./manual-classifications.json";
import weaponTypes from "./weapon-types.json";
import type { ItemClassification, MonsterClassification, TaxonomySnapshot } from "./types";

type ManualClassificationMap = {
  items?: Record<string, Partial<ItemClassification>>;
  monsters?: Record<string, Partial<MonsterClassification>>;
};

const manual = manualClassifications as ManualClassificationMap;

export const TaxonomyService = {
  getSnapshot(): TaxonomySnapshot {
    return {
      creatureClasses,
      itemCategories,
      equipmentSlots,
      weaponTypes
    };
  },

  classifyItem(item: { id: number; name: string }): ItemClassification {
    const key = itemLookupKey(item.name);
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

    const rule = classifyItemByName(key);
    return {
      itemId: item.id,
      name: item.name,
      ...rule
    };
  },

  classifyMonster(monster: { name: string }): MonsterClassification {
    const key = itemLookupKey(monster.name);
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
};

function classifyItemByName(key: string): Omit<ItemClassification, "itemId" | "name"> {
  if (isAny(key, ["gold coin", "platinum coin", "crystal coin", "tibia coin"])) {
    return { category: "currency", confidence: "high", matchedBy: "currency-exact" };
  }

  if (hasAny(key, [" coin", " token"]) || key.endsWith("coin") || key.endsWith("token")) {
    return { category: "currency", confidence: "medium", matchedBy: "currency-name" };
  }

  const slot = getEquipmentSlot(key);
  if (slot) {
    return { category: slot, slot, confidence: "medium", matchedBy: `equipment-slot:${slot}` };
  }

  const weaponType = getWeaponType(key);
  if (weaponType) {
    return { category: "weapon", weaponType, confidence: "medium", matchedBy: `weapon-type:${weaponType}` };
  }

  if (hasAny(key, [" potion", "fluid", " flask"]) || key.endsWith("potion")) {
    return { category: "potion", confidence: "medium", matchedBy: "potion-name" };
  }

  if (hasAny(key, [" rune"]) || key.endsWith("rune")) {
    return { category: "rune", confidence: "medium", matchedBy: "rune-name" };
  }

  if (hasAny(key, ["backpack", "bag", "box", "chest", "crate"])) {
    return { category: "container", confidence: "low", matchedBy: "container-name" };
  }

  if (isFoodName(key)) {
    return { category: "food", confidence: "medium", matchedBy: "food-name" };
  }

  if (isCreatureProductName(key)) {
    return { category: "creature-product", confidence: "low", matchedBy: "creature-product-name" };
  }

  if (hasAny(key, ["book", "scroll", "document", "paper", "parchment"])) {
    return { category: "book", confidence: "low", matchedBy: "book-name" };
  }

  return { category: "misc", confidence: "unclassified", matchedBy: "none" };
}

function classifyMonsterByName(key: string): Omit<MonsterClassification, "name"> {
  const rules: Array<{ creatureClass: string; terms: string[]; confidence: "medium" | "low" }> = [
    { creatureClass: "dragon", terms: ["dragon", "draken", "wyrm", "frost dragon"], confidence: "medium" },
    { creatureClass: "demon", terms: ["demon", "hellhound", "hellfire", "juggernaut", "plaguesmith", "vexclaw"], confidence: "medium" },
    { creatureClass: "undead", terms: ["undead", "skeleton", "zombie", "vampire", "ghost", "ghoul", "mummy", "lich", "banshee", "reaper"], confidence: "medium" },
    { creatureClass: "vermin", terms: ["rat", "spider", "bug", "worm", "wasp", "scorpion", "larva", "beetle", "crawler", "centipede"], confidence: "medium" },
    { creatureClass: "aquatic", terms: ["quara", "calamary", "shark", "crab", "fish", "deepling", "squid"], confidence: "medium" },
    { creatureClass: "amphibic", terms: ["frog", "toad", "salamander"], confidence: "medium" },
    { creatureClass: "bird", terms: ["bird", "chicken", "parrot", "flamingo", "feather", "penguin"], confidence: "low" },
    { creatureClass: "construct", terms: ["golem", "construct", "machine", "generator", "worker golem"], confidence: "medium" },
    { creatureClass: "elemental", terms: ["elemental", "fire", "energy", "ice", "earth"], confidence: "low" },
    { creatureClass: "giant", terms: ["giant", "cyclops", "troll champion"], confidence: "medium" },
    { creatureClass: "plant", terms: ["plant", "tree", "fungus", "carniphila", "spit nettle"], confidence: "medium" },
    { creatureClass: "reptile", terms: ["lizard", "snake", "serpent", "crocodile", "tortoise", "turtle"], confidence: "medium" },
    { creatureClass: "slime", terms: ["slime", "blob"], confidence: "medium" },
    { creatureClass: "lycanthrope", terms: ["were", "werewolf", "werebear", "wereboar", "werebadger", "werefox"], confidence: "medium" },
    { creatureClass: "human", terms: ["amazon", "assassin", "bandit", "hunter", "monk", "pirate", "smuggler", "valkyrie", "warlock"], confidence: "low" },
    { creatureClass: "humanoid", terms: ["orc", "minotaur", "elf", "dwarf", "goblin", "troll", "corym"], confidence: "medium" },
    { creatureClass: "mammal", terms: ["bear", "deer", "dog", "wolf", "lion", "tiger", "bat", "boar", "mammoth", "elephant"], confidence: "low" },
    { creatureClass: "magical", terms: ["djinn", "fairy", "wisp", "phantasm", "spectre"], confidence: "low" },
    { creatureClass: "fey", terms: ["faun", "pixie", "nymph", "swan maiden"], confidence: "low" },
    { creatureClass: "extra-dimensional", terms: ["astral", "reality", "void", "rift"], confidence: "low" },
    { creatureClass: "inkborn", terms: ["ink", "squidgy"], confidence: "low" },
    { creatureClass: "bane", terms: ["bane"], confidence: "low" }
  ];

  for (const rule of rules) {
    if (hasAny(key, rule.terms)) {
      return {
        creatureClass: rule.creatureClass,
        confidence: rule.confidence,
        matchedBy: `name-rule:${rule.creatureClass}`
      };
    }
  }

  return { confidence: "unclassified", matchedBy: "none" };
}

function getEquipmentSlot(key: string) {
  const slotTerms: Array<[string, string[]]> = [
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

function getWeaponType(key: string) {
  const weaponTerms: Array<[string, string[]]> = [
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

function isFoodName(key: string) {
  return hasAny(key, [
    "apple",
    "banana",
    "bread",
    "carrot",
    "cheese",
    "cookie",
    "fish",
    "ham",
    "meat",
    "mushroom",
    "pear",
    "shrimp",
    "strawberry",
    "tomato"
  ]);
}

function isCreatureProductName(key: string) {
  return hasAny(key, [
    "beak",
    "blood",
    "bone",
    "brain",
    "claw",
    "eye",
    "fang",
    "feather",
    "fur",
    "hide",
    "horn",
    "pelt",
    "scale",
    "shell",
    "silk",
    "skull",
    "tail",
    "teeth",
    "tooth",
    "tusk",
    "venom",
    "wing"
  ]);
}

function isAny(value: string, options: string[]) {
  return options.includes(value);
}

function hasAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
