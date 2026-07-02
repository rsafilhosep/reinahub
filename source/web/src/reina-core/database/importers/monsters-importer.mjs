import { extractTags, parseAttributes, readText, stripOuterTag, toNumber, walkFilesByExtension } from "./xml-utils.mjs";

export function importMonstersXml(monstersPath) {
  if (!monstersPath) return [];
  const files = walkFilesByExtension(monstersPath, [".xml", ".lua"]);
  const monsters = [];

  for (const file of files) {
    const xml = readText(file);
    if (file.toLowerCase().endsWith(".lua")) {
      const monster = parseLuaMonster(xml);
      if (monster) monsters.push(monster);
    } else {
      for (const block of extractTags(xml, "monster")) {
        const monster = parseMonsterBlock(block);
        if (monster) monsters.push(monster);
      }
    }
  }

  return monsters.sort((a, b) => a.name.localeCompare(b.name));
}

function parseLuaMonster(source) {
  const name = source.match(/Game\.createMonsterType\(\s*["']([^"']+)["']\s*\)/)?.[1];
  if (!name) return null;

  return {
    name,
    experience: toNumber(source.match(/monster\.experience\s*=\s*([0-9.]+)/)?.[1]) ?? 0,
    health: toNumber(source.match(/monster\.maxHealth\s*=\s*([0-9.]+)/)?.[1] ?? source.match(/monster\.health\s*=\s*([0-9.]+)/)?.[1]) ?? 0,
    speed: toNumber(source.match(/monster\.speed\s*=\s*([0-9.]+)/)?.[1]) ?? 0,
    loot: parseLuaLoot(source)
  };
}

function parseLuaLoot(source) {
  const lootBlock = extractLuaAssignedTable(source, "monster.loot");
  const loot = [];

  for (const row of lootBlock.matchAll(/\{([^{}]+)\}/g)) {
    const itemSource = row[1];
    const itemName = itemSource.match(/name\s*=\s*["']([^"']+)["']/)?.[1];
    const itemId = toNumber(itemSource.match(/id\s*=\s*([0-9]+)/)?.[1] ?? itemSource.match(/itemId\s*=\s*([0-9]+)/)?.[1]);
    const chance = toNumber(itemSource.match(/chance\s*=\s*([0-9.]+)/)?.[1]);
    const maxCount = toNumber(itemSource.match(/maxCount\s*=\s*([0-9.]+)/)?.[1] ?? itemSource.match(/countmax\s*=\s*([0-9.]+)/)?.[1] ?? itemSource.match(/count\s*=\s*([0-9.]+)/)?.[1]);

    loot.push({
      ...(itemId ? { itemId } : {}),
      ...(itemName ? { itemName } : {}),
      ...(chance !== undefined ? { chance } : {}),
      ...(maxCount !== undefined ? { maxCount } : {})
    });
  }

  return loot;
}

function extractLuaAssignedTable(source, assignmentName) {
  const assignmentIndex = source.indexOf(assignmentName);
  if (assignmentIndex < 0) return "";
  const openIndex = source.indexOf("{", assignmentIndex);
  if (openIndex < 0) return "";

  let depth = 0;
  let quote = "";
  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];
    const prev = source[index - 1];

    if (quote) {
      if (char === quote && prev !== "\\") quote = "";
      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) return source.slice(openIndex + 1, index);
  }

  return "";
}

export function flattenMonsterLoot(monsters) {
  return monsters.flatMap((monster) => monster.loot.map((loot) => ({ monsterName: monster.name, ...loot })));
}

function parseMonsterBlock(block) {
  const openTag = block.match(/^<monster\b[^>]*>/i)?.[0] ?? block;
  const attrs = parseAttributes(openTag);
  const name = attrs.name;
  if (!name) return null;

  const healthTag = block.match(/<health\b[^>]*(?:\/>|>[\s\S]*?<\/health>)/i)?.[0] ?? "";
  const healthAttrs = parseAttributes(healthTag);
  const lootBlock = block.match(/<loot\b[^>]*>[\s\S]*?<\/loot>/i)?.[0] ?? "";
  const lootInner = lootBlock ? stripOuterTag(lootBlock, "loot") : "";

  return {
    name,
    experience: toNumber(attrs.experience) ?? 0,
    health: toNumber(healthAttrs.max ?? healthAttrs.now) ?? 0,
    speed: toNumber(attrs.speed) ?? 0,
    loot: parseLootItems(lootInner)
  };
}

function parseLootItems(xml) {
  const loot = [];
  for (const itemTag of xml.matchAll(/<item\b[^>]*(?:\/>|>[\s\S]*?<\/item>)/gi)) {
    const attrs = parseAttributes(itemTag[0].match(/^<item\b[^>]*>/i)?.[0] ?? itemTag[0]);
    const itemId = toNumber(attrs.id ?? attrs.itemid);
    const itemName = attrs.name;
    const chance = toNumber(attrs.chance);
    const maxCount = toNumber(attrs.countmax ?? attrs.maxcount ?? attrs.count);

    loot.push({
      ...(itemId ? { itemId } : {}),
      ...(itemName ? { itemName } : {}),
      ...(chance !== undefined ? { chance } : {}),
      ...(maxCount !== undefined ? { maxCount } : {})
    });
  }
  return loot;
}
