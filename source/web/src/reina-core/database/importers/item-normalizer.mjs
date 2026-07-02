export function normalizeItemName(name = "") {
  return decodeXml(name)
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[‘’´`]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function itemLookupKey(name = "") {
  return normalizeItemName(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function loadManualMappings(rawMappings = {}) {
  const itemNameAliases = {};
  for (const [alias, target] of Object.entries(rawMappings.itemNameAliases ?? {})) {
    itemNameAliases[itemLookupKey(alias)] = target;
  }

  const itemIdAliases = {};
  for (const [aliasId, target] of Object.entries(rawMappings.itemIdAliases ?? {})) {
    itemIdAliases[String(aliasId)] = target;
  }

  return { itemNameAliases, itemIdAliases };
}
