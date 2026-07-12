import { itemLookupKey } from "@/source/web/src/reina-core/database/normalize";

export type SearchRankedEntry<T> = {
  row: T;
  label: string;
  normalizedLabel: string;
  score: number;
};

export function rankSearchResults<T>(
  rows: T[],
  query: string,
  getLabel: (row: T) => string,
  limit?: number
) {
  const entries = rankSearchEntries(rows, query, getLabel);
  const limited = typeof limit === "number" ? entries.slice(0, limit) : entries;
  return limited.map((entry) => entry.row);
}

export function rankSearchEntries<T>(
  rows: T[],
  query: string,
  getLabel: (row: T) => string
): SearchRankedEntry<T>[] {
  const normalizedQuery = itemLookupKey(query);
  if (!normalizedQuery) return [];

  return rows
    .map((row) => {
      const label = getLabel(row);
      const normalizedLabel = itemLookupKey(label);
      const score = getSearchScore(normalizedLabel, normalizedQuery);
      return { row, label, normalizedLabel, score };
    })
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => a.score - b.score || a.label.length - b.label.length || a.label.localeCompare(b.label));
}

export function matchesSearchQuery(label: string, query: string) {
  const normalizedQuery = itemLookupKey(query);
  if (!normalizedQuery) return true;
  return Number.isFinite(getSearchScore(itemLookupKey(label), normalizedQuery));
}

export function getSearchScore(normalizedLabel: string, normalizedQuery: string) {
  if (!normalizedQuery) return 0;
  if (normalizedLabel === normalizedQuery) return 0;
  if (normalizedLabel.startsWith(`${normalizedQuery} `)) return 5;

  const words = normalizedLabel.split(" ").filter(Boolean);
  if (words.includes(normalizedQuery)) return 10;
  if (normalizedLabel.startsWith(normalizedQuery)) return 20;
  if (words.some((word) => word.startsWith(normalizedQuery))) return 30;

  const index = normalizedLabel.indexOf(normalizedQuery);
  if (index >= 0) return 100 + index;

  return Number.POSITIVE_INFINITY;
}
