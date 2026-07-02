import { parseAttributes, readText, toNumber } from "./xml-utils.mjs";

export function importItemsXml(itemsPath) {
  if (!itemsPath) return [];
  const xml = readText(itemsPath);
  const items = [];

  for (const tagMatch of xml.matchAll(/<item\b[^>]*>/gi)) {
    const attrs = parseAttributes(tagMatch[0]);
    const fromId = toNumber(attrs.fromid);
    const toId = toNumber(attrs.toid);
    const id = toNumber(attrs.id);
    const ids = fromId && toId ? range(fromId, toId) : id ? [id] : [];
    if (!ids.length) continue;

    const name = attrs.name;
    const clientId = toNumber(attrs.clientid ?? attrs.clientId);
    if (!name) continue;

    for (const itemId of ids) {
      items.push({
        id: itemId,
        name,
        ...(clientId && ids.length === 1 ? { clientId } : {})
      });
    }
  }

  return items.sort((a, b) => a.id - b.id);
}

function range(from, to) {
  const ids = [];
  for (let id = from; id <= to; id += 1) ids.push(id);
  return ids;
}
