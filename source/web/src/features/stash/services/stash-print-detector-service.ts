export type StashPrintLine = {
  id: string;
  raw: string;
  query: string;
  quantity: number;
};

export const StashPrintDetectorService = {
  async readText(file: File, onProgress?: (progress: number, status: string) => void) {
    const { recognize } = await import("tesseract.js");
    const result = await recognize(file, "eng", {
      logger(message) {
        if (message.status === "recognizing text") onProgress?.(Math.round((message.progress || 0) * 100), "Lendo nomes e quantidades...");
        else if (message.status) onProgress?.(Math.round((message.progress || 0) * 100), formatStatus(message.status));
      }
    });
    return result.data.text || "";
  },

  parseLines(text: string): StashPrintLine[] {
    const seen = new Set<string>();
    return text
      .split(/\r?\n/)
      .map((raw) => parseLine(raw))
      .filter((line): line is StashPrintLine => Boolean(line && line.query.length >= 3))
      .filter((line) => {
        const key = `${line.query}:${line.quantity}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 24);
  }
};

function parseLine(rawLine: string): StashPrintLine | null {
  const raw = rawLine.replace(/[|_[\]{}]/g, " ").replace(/\s+/g, " ").trim();
  if (!raw || !/[a-zA-Z]{3}/.test(raw)) return null;
  const leading = raw.match(/^\s*(\d[\d.,]*)\s*[xX]?\s+(.+)$/);
  const trailing = raw.match(/^(.+?)\s+[xX]?\s*(\d[\d.,]*)\s*$/);
  let quantity = 1;
  let query = raw;
  if (leading) {
    quantity = parseQuantity(leading[1]);
    query = leading[2];
  } else if (trailing) {
    query = trailing[1];
    quantity = parseQuantity(trailing[2]);
  }
  query = query
    .replace(/\b(stash|inbox|locker|depot|search|filter|sort|market|browse|item|items)\b/gi, " ")
    .replace(/[^a-zA-Z' -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!query || query.length < 3) return null;
  return { id: `${query}-${quantity}-${Math.random().toString(36).slice(2, 8)}`, raw, query, quantity: Math.max(1, quantity) };
}

function parseQuantity(value: string) {
  const parsed = Number(value.replace(/[.,]/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function formatStatus(status: string) {
  if (status.includes("loading language")) return "Carregando leitor de texto...";
  if (status.includes("initializing")) return "Preparando reconhecimento...";
  return "Analisando o print...";
}
