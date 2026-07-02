export function money(value: number, decimals = 2) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

export function moneySmart(value: number, maxDecimals = 8) {
  if (!Number.isFinite(value)) return "0,00";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals
  });
}

export function integer(value: number) {
  if (!Number.isFinite(value)) return "0";
  return Math.round(value).toLocaleString("pt-BR");
}

export function parseGameNumber(value: string | number | undefined) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return parseInt(String(value).replace(/,/g, "").replace(/\./g, ""), 10) || 0;
}
