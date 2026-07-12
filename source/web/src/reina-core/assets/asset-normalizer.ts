const normalizeCache = new Map<string, string>();

export function normalizeAssetLookupKey(value?: string | null) {
  const original = String(value ?? "");
  const cached = normalizeCache.get(original);
  if (cached !== undefined) return cached;

  const normalized = original
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF\u00A0]/g, " ")
    .replace(/[\u2018\u2019\u00B4`]/g, "'")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['"]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  normalizeCache.set(original, normalized);
  return normalized;
}

export function normalizeAssetName(value?: string | null) {
  return normalizeAssetLookupKey(value).replace(/\s+/g, "-");
}

export function clearAssetNormalizerCache() {
  normalizeCache.clear();
}
